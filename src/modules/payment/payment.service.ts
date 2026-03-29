import { Injectable } from '@nestjs/common'
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

	public async create(data: CreatePaymentRequest) {
		const { savePaymentMethod, seats, sessionId, userId, paymentMethodId } =
			data
		const transaction = await this.repository.create({ amount: 300, userId })
		const payment = this.liqpay.payments.create({
			action: 'pay',
			orderId: transaction.id,
			amount: transaction.amount,
			currency: 'UAH',
			description: `Payment for tickets for session #${sessionId}`,
			paytypes: ['apay', 'card', 'gpay', 'privat24', 'qr'],
			customer: `user-${userId}`,
			recurringbytoken: savePaymentMethod,
			customerUserId: userId
		})
		await this.repository.update(transaction.id, {
			metadata: JSON.stringify(payment)
		})
		return { checkoutUrl: payment.checkoutUrl }
	}

	public async handlePaymentEvent(data: ProcessPaymentEventRequest) {
		const { provider, data: payload, signature } = data
		const decrypted = await this.liqpay.webhooks.parseCheckoutCallback({
			data: payload,
			signature
		})
		console.log('DECRYPTED: ', decrypted)
		return { ok: true }
	}

	public async getPaymentStatus(orderId: string) {
		const status = await this.liqpay.payments.getPaymentStatus(orderId)
		console.log('PAYMENT STATUS: ', status)
		return { ok: true }
	}
}
