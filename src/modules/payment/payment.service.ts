import { Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { PaymentMethod, PaymentMethodStatus } from '@prisma/generated/client'
import { RpcStatus } from '@vendee-cinema/common'
import type {
	CreatePaymentRequest,
	ProcessPaymentEventRequest
} from '@vendee-cinema/contracts/payment'
import { LiqpayService } from 'liqpay-nestjs'

import { PaymentRepository } from './payment.repository'

@Injectable()
export class PaymentService {
	public constructor(
		private readonly repository: PaymentRepository,
		private readonly liqpay: LiqpayService
	) {}

	// TODO: user phone is needed so must to update passport and current user decorator to return not only userId but another fields ***OR USE user-service
	public async create(data: CreatePaymentRequest) {
		const { savePaymentMethod, seats, sessionId, userId, paymentMethodId } =
			data

		const transaction = await this.repository.create({ amount: 300, userId })

		let paymentMethod: PaymentMethod | null = null
		if (paymentMethodId) {
			paymentMethod =
				await this.repository.findPaymentMethodById(paymentMethodId)
			if (!paymentMethod)
				throw new RpcException({
					code: RpcStatus.NOT_FOUND,
					details: 'Payment method not found'
				})
		}

		const payment = this.liqpay.payments.create({
			action: paymentMethod ? 'paytoken' : 'pay',
			orderId: transaction.id,
			amount: transaction.amount,
			currency: 'UAH',
			description: `Payment for tickets for session #${sessionId}`,
			paytypes: ['apay', 'card', 'gpay', 'privat24', 'qr'],
			...(savePaymentMethod
				? {
						customer: `+380123456789`,
						recurringbytoken: true,
						customerUserId: userId
					}
				: {}),
			...(paymentMethod
				? { cardToken: paymentMethod.providerId, ip: paymentMethod.ip }
				: {})
		})

		await this.repository.update(transaction.id, {
			metadata: JSON.stringify(payment)
		})

		return { checkoutUrl: payment.checkoutUrl }
	}

	public async processEvent(data: ProcessPaymentEventRequest) {
		const { provider, data: raw, signature } = data

		const { data: payload, error } =
			await this.liqpay.webhooks.parseCheckoutCallback({
				data: raw,
				signature
			})
		if (!data)
			throw new RpcException({
				code: RpcStatus.INTERNAL,
				details: `${provider} error: ${error.code} - ${error.description}`
			})

		const {
			orderId,
			status,
			cardToken,
			customer,
			paytype,
			senderCardBank,
			senderCardType,
			senderCardMask2,
			ip
		} = payload
		const payment = this.repository.findById(orderId)
		if (!payment)
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: 'Payment not found'
			})

		if (status === 'success') {
			await this.repository.markSuccessed(orderId)
			if (cardToken) {
				const existing = await this.repository.findActivePaymentMethod(
					customer,
					cardToken
				)
				if (existing) return
				try {
					await this.repository.createPaymentMethod({
						type: paytype,
						providerId: cardToken,
						// must get userId by phone
						userId: customer,
						status: PaymentMethodStatus.ACTIVE,
						bank: senderCardBank,
						brand: senderCardType,
						mask: senderCardMask2,
						ip
					})
				} catch (error) {
					console.error(
						`Failed to save payment method for user ${customer}: `,
						error
					)
				}
			}
		}
		if (status === 'error' || status === 'failure')
			await this.repository.markFailed(orderId)

		return { ok: true }
	}

	public async getStatus(orderId: string) {
		const status = await this.liqpay.payments.getPaymentStatus(orderId)
		console.log('PAYMENT STATUS: ', status)
		return { ok: true }
	}
}
