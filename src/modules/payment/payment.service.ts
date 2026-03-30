import { Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { PaymentMethod, PaymentMethodStatus } from '@prisma/generated/client'
import { RpcStatus } from '@vendee-cinema/common'
import type {
	CreatePaymentRequest,
	GetPaymentStatusRequest,
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

		// TODO: update when implement booking/order-service
		const order = await this.repository.create({ amount: 300, userId })

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
			orderId: order.id,
			amount: order.amount,
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
				? { cardToken: paymentMethod.token, ip: paymentMethod.ip }
				: {})
		})

		await this.repository.update(order.id, {
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
		if (error)
			throw new RpcException({
				code: RpcStatus.INTERNAL,
				details: `${provider} error: ${error.code} - ${error.description}`
			})

		const order = this.repository.findById(payload.orderId)
		if (!order)
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: 'Payment not found'
			})

		await this.repository.update(payload.orderId, {
			providerPaymentId: payload.paymentId
		})

		if (status === 'success') {
			await this.repository.markSuccessed(payload.orderId)
			if (payload.cardToken) {
				const existing = await this.repository.findActivePaymentMethod(
					payload.customer,
					payload.cardToken
				)
				if (existing) return
				try {
					await this.repository.createPaymentMethod({
						type: payload.paytype,
						token: payload.cardToken,
						// must get userId by phone
						userId: payload.customer,
						status: PaymentMethodStatus.ACTIVE,
						bank: payload.senderCardBank,
						brand: payload.senderCardType,
						mask: payload.senderCardMask2,
						ip: payload.ip
					})
				} catch (error) {
					console.error(
						`Failed to save payment method for user ${payload.customer}: `,
						error
					)
				}
			}
		}
		if (payload.status === 'error' || payload.status === 'failure')
			await this.repository.markFailed(payload.orderId)

		return { ok: true }
	}

	// getting status with calling LiqPay Api
	public async getStatusWithApi(data: GetPaymentStatusRequest) {
		const { orderId } = data

		const order = await this.repository.findById(orderId)
		if (!order)
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: 'Payment not found'
			})

		const { data: payload, error } =
			await this.liqpay.payments.getPaymentStatus(orderId)
		// if (error)
		// 	throw new RpcException({
		// 		code: RpcStatus.INTERNAL,
		// 		details: `error: ${error.code} - ${error.description}`
		// 	})
		if (!payload) await this.repository.markFailed(orderId)

		if (payload?.status === 'success')
			await this.repository.markSuccessed(orderId)
		if (payload?.status === 'error' || payload?.status === 'failure')
			await this.repository.markFailed(orderId)

		const { status } = await this.repository.findById(orderId)
		return { status }
	}

	// getting status just from our database
	public async getStatus(data: GetPaymentStatusRequest) {
		const { orderId } = data
		const { status } = await this.repository.findById(orderId)
		return { status }
	}
}
