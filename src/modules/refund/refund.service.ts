import { Injectable } from '@nestjs/common'
import { RpcException } from '@nestjs/microservices'
import { RpcStatus } from '@vendee-cinema/common'
import { CreateRefundRequest } from '@vendee-cinema/contracts/refund'
import { LiqpayService } from 'liqpay-nestjs'

import { RefundRepository } from './refund.repository'

@Injectable()
export class RefundService {
	public constructor(
		private readonly repository: RefundRepository,
		private readonly liqpay: LiqpayService
	) {}

	public async create(data: CreateRefundRequest) {
		const { bookingId, userId } = data

		const payment = await this.repository.findPaymentByBookingId(bookingId)

		if (!payment || payment.userId !== userId)
			throw new RpcException({
				code: RpcStatus.NOT_FOUND,
				details: 'Payment not found'
			})

		const refund = await this.repository.createRefund({
			amount: payment.amount,
			payment: { connect: { id: payment.id } }
		})

		const { data: response, error } = await this.liqpay.refunds.refund({
			orderId: payment.bookingId,
			amount: payment.amount
		})
		// console.log('RESPONSE: ', response)
		if (error) {
			console.log('ERROR: ', error)

			throw new RpcException({
				code: RpcStatus.INTERNAL,
				details: `error: ${error.code} - ${error.description}`
			})
		}

		await this.repository.updateRefund(refund.id, {
			providerId: response.paymentId
		})

		return { ok: true }
	}
}
