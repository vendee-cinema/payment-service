import { Injectable } from '@nestjs/common'
import { PaymentStatus, RefundStatus } from '@prisma/generated/enums'
import { RefundCreateInput, RefundUpdateInput } from '@prisma/generated/models'

import { PrismaService } from '@/infra/prisma'

@Injectable()
export class RefundRepository {
	constructor(private readonly prisma: PrismaService) {}

	public async findRefundByProvider(providerId: string) {
		return await this.prisma.refund.findFirst({
			where: { providerId },
			include: { payment: true }
		})
	}

	public async findPaymentByBookingId(bookingId: string) {
		return await this.prisma.payment.findFirst({ where: { bookingId } })
	}

	public async findRefundByPaymentId(paymentId: string) {
		return await this.prisma.refund.findFirst({ where: { paymentId } })
	}

	public async createRefund(data: RefundCreateInput) {
		return await this.prisma.refund.create({ data })
	}

	public async updateRefund(id: string, data: RefundUpdateInput) {
		return await this.prisma.refund.update({ where: { id }, data })
	}

	public async markRefundSuccessed(id: string) {
		return await this.prisma.refund.update({
			where: { id },
			data: { status: RefundStatus.SUCCESS }
		})
	}

	public async markPaymentRefunded(id: string) {
		return await this.prisma.payment.update({
			where: { id },
			data: { status: PaymentStatus.REFUNDED }
		})
	}

	public async markRefundFailed(id: string) {
		return await this.prisma.refund.update({
			where: { id },
			data: { status: RefundStatus.FAILED }
		})
	}
}
