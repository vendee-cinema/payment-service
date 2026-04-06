import { Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { PaymentMethod, PaymentMethodStatus } from '@prisma/generated/client'
import { RpcStatus } from '@vendee-cinema/common'
import type {
	CreatePaymentMethodRequest,
	CreatePaymentRequest,
	DeletePaymentMethodRequest,
	GetPaymentStatusRequest,
	GetUserPaymentMethodsRequest,
	ProcessPaymentEventRequest,
	VerifyPaymentMethodRequest
} from '@vendee-cinema/contracts/payment'
import { LiqpayService } from 'liqpay-nestjs'
import { lastValueFrom } from 'rxjs'

import { BookingClientGrpc } from '@/clients'

import { RefundRepository } from '../refund'

import { PaymentRepository } from './payment.repository'

@Injectable()
export class PaymentService {
	public constructor(
		private readonly paymentRepository: PaymentRepository,
		private readonly refundRepository: RefundRepository,
		private readonly liqpay: LiqpayService,
		private readonly bookingClient: BookingClientGrpc
	) {}

	// TODO: user phone is needed so must to update passport and current user decorator to return not only userId but another fields ***OR USE user-service
	public async create(data: CreatePaymentRequest) {
		const { savePaymentMethod, seats, sessionId, userId, paymentMethodId } =
			data

		const reservation = await lastValueFrom(
			this.bookingClient.createReservation({
				userId,
				sessionId,
				seats
			})
		)

		const payment = await this.paymentRepository.create({
			amount: reservation.amount,
			userId,
			provider: 'LIQPAY',
			bookingId: reservation.orderId
		})

		let paymentMethod: PaymentMethod | null = null
		if (paymentMethodId) {
			paymentMethod =
				await this.paymentRepository.findPaymentMethodById(paymentMethodId)
			if (!paymentMethod) {
				console.error('Payment method not found')
				throw new RpcException({
					code: RpcStatus.NOT_FOUND,
					details: 'Payment method not found'
				})
			}
			// TODO: add paying by token
		}

		const { request, url } = this.liqpay.payments.getCheckoutUrl({
			orderId: reservation.orderId,
			amount: payment.amount,
			currency: 'UAH',
			description: `Payment for tickets for session #${sessionId}`,
			paytypes: ['apay', 'card', 'gpay', 'privat24', 'qr'],
			info: JSON.stringify({ userId }),
			...(savePaymentMethod
				? {
						// must set customer to user phone
						customer: `+380123456789`,
						recurringByToken: true,
						customerUserId: userId
					}
				: {})
		})

		console.log('CREATE: ', { ...request, url })

		await this.paymentRepository.update(payment.id, {
			metadata: JSON.stringify(request)
		})

		return { checkoutUrl: url }
	}

	public async processPaymentEvent(data: ProcessPaymentEventRequest) {
		// get raw encoded callback data
		const { data: raw, provider, signature } = data

		// decode raw data
		const { data: response, error } =
			await this.liqpay.webhooks.parseCheckoutCallbackTest({
				data: raw,
				signature
			})
		const { userId } = JSON.parse(response.info)
		// console.log('CALLBACK: ', response)

		if (error) {
			console.error('LIB ERROR: ', error)
			throw new RpcException({
				code: RpcStatus.INTERNAL,
				details: `${provider} error: ${error.code} - ${error.description}`
			})
		}

		// get payment from db
		const payment = await this.paymentRepository.findByBookingId(
			response.orderId
		)
		if (!payment) {
			console.error('Payment not found')
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: 'Payment not found'
			})
		}

		// connect provider paymentId with payment in our db
		await this.paymentRepository.update(payment.id, {
			providerId: response.paymentId
		})

		// mark payment status
		if (response.status === 'reversed') {
			const refund = await this.refundRepository.findRefundByPaymentId(
				payment.id
			)
			if (!refund) {
				console.error('Refund not found')
				throw new RpcException({
					code: RpcStatus.NOT_FOUND,
					details: 'Refund not found'
				})
			}
			try {
				await this.refundRepository.markRefundSuccessed(refund.id)
				await this.refundRepository.markPaymentRefunded(payment.id)
				await lastValueFrom(
					this.bookingClient.cancelBooking({
						bookingId: refund.payment.bookingId,
						userId: refund.payment.userId
					})
				)
			} catch (error) {
				console.error('Failed to process refund: ', error)
				// throw new RpcException({
				// 	code: RpcStatus.INTERNAL,
				// 	details: 'Failed to process refund'
				// })
			}
		}
		if (response.status === 'error' || response.status === 'failure') {
			try {
				await this.paymentRepository.markFailed(payment.id)
			} catch (error) {
				console.error('Failed to process payment:', error)
				// throw new RpcException({
				// 	code: RpcStatus.INTERNAL,
				// 	details: 'Failed to process payment'
				// })
			}
		}
		if (response.status === 'success') {
			try {
				await this.paymentRepository.markSuccessed(payment.id)
			} catch (error) {
				console.error('Failed to process payment: ', error)
				// throw new RpcException({
				// 	code: RpcStatus.INTERNAL,
				// 	details: 'Failed to process payment'
				// })
			}

			// if callback have token save it
			if (response.cardToken) {
				const existing = await this.paymentRepository.findActivePaymentMethod(
					userId,
					response.cardToken
				)
				if (existing) return

				try {
					await this.paymentRepository.createPaymentMethod({
						type: response.paytype,
						token: response.cardToken,
						phone: response.customer,
						userId,
						status: PaymentMethodStatus.ACTIVE,
						bank: response.senderCardBank,
						brand: response.senderCardType,
						mask: response.senderCardMask2,
						ip: response.ip
					})
				} catch (error) {
					console.error(
						`Failed to save payment method for user ${userId}: `,
						error
					)
					// throw new RpcException({
					// 	code: RpcStatus.INTERNAL,
					// 	details: `Failed to save payment method for user ${userId}: ${error}`
					// })
				}
			}
			try {
				await lastValueFrom(
					this.bookingClient.confirmBooking({
						bookingId: response.orderId,
						userId
					})
				)
			} catch (error) {
				console.error('Failed to call booking.confirmBooking: ', error)
				// throw new RpcException({
				// 	code: RpcStatus.INTERNAL,
				// 	details: `Failed to call booking.confirmBooking: ${error}`
				// })
			}
		}

		return { ok: true }
	}

	// getting status with calling LiqPay Api
	public async getStatusWithApi(data: GetPaymentStatusRequest) {
		const { paymentId } = data

		const payment = await this.paymentRepository.findById(paymentId)
		if (!payment) {
			console.error('Payment not found')
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: 'Payment not found'
			})
		}

		const { data: response, error } = await this.liqpay.payments.getStatus({
			orderId: payment.bookingId
		})
		if (error) {
			console.error('LIB ERROR: ', error)
			await this.paymentRepository.markFailed(paymentId)
			throw new RpcException({
				code: RpcStatus.INTERNAL,
				details: `error: ${error.code} - ${error.description}`
			})
		}
		// console.log('STATUS:', response)

		if (response.status === 'reversed') {
			try {
				const refund = await this.refundRepository.findRefundByPaymentId(
					payment.id
				)
				if (!refund) {
					console.error('Refund not found')
					throw new RpcException({
						code: RpcStatus.NOT_FOUND,
						details: 'Refund not found'
					})
				}
				await this.refundRepository.markRefundSuccessed(refund.id)
				await this.refundRepository.markPaymentRefunded(payment.id)
			} catch {
				console.error('Failed to process refund')
				throw new RpcException({
					code: RpcStatus.INTERNAL,
					details: 'Failed to process refund'
				})
			}
		}
		if (response.status === 'success')
			await this.paymentRepository.markSuccessed(paymentId)
		if (response.status === 'error' || response.status === 'failure')
			await this.paymentRepository.markFailed(paymentId)

		const { status } = await this.paymentRepository.findById(paymentId)
		return { status }
	}

	public async getUserPaymentMethods(data: GetUserPaymentMethodsRequest) {
		const { userId } = data
		const methods =
			await this.paymentRepository.findPaymentMethodsByUser(userId)
		return { methods }
	}

	public async createPaymentMethod(data: CreatePaymentMethodRequest) {
		throw new RpcException({
			code: RpcStatus.UNIMPLEMENTED,
			details: 'createPaymentMethod is not implemented'
		})
		const { userId } = data
		return { id: '', url: '' }
	}

	public async verifyPaymentMethod(data: VerifyPaymentMethodRequest) {
		const { methodId, userId } = data
		const method = await this.paymentRepository.findPaymentMethodById(methodId)
		if (!method || method.userId !== userId) {
			console.error('Payment method not found')
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: 'Payment method not found'
			})
		}
		return { ok: true }
	}

	public async deletePaymentMethod(data: DeletePaymentMethodRequest) {
		const { methodId, userId } = data
		const method = await this.paymentRepository.findPaymentMethodById(methodId)
		if (!method || method.userId !== userId) {
			console.error('Payment method not found')
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: 'Payment method not found'
			})
		}
		await this.paymentRepository.deletePaymentMethod(methodId)
		return { ok: true }
	}
}
