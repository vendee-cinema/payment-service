import { Injectable } from '@nestjs/common'
import { PaymentMethodStatus, PaymentStatus } from '@prisma/generated/enums'
import type {
	PaymentCreateInput,
	PaymentMethodCreateInput,
	PaymentMethodUpdateInput,
	PaymentUpdateInput
} from '@prisma/generated/models'

import { PrismaService } from '@/infra/prisma'

@Injectable()
export class PaymentRepository {
	public constructor(private readonly prisma: PrismaService) {}

	public async findById(id: string) {
		return await this.prisma.payment.findUnique({ where: { id } })
	}

	public async findByBookingId(bookingId: string) {
		return await this.prisma.payment.findFirst({ where: { bookingId } })
	}

	public async findByProviderPaymentId(providerId: string) {
		return await this.prisma.payment.findFirst({ where: { providerId } })
	}

	public async create(data: PaymentCreateInput) {
		return await this.prisma.payment.create({ data })
	}

	public async update(id: string, data: PaymentUpdateInput) {
		return await this.prisma.payment.update({ where: { id }, data })
	}

	public async markSuccessed(id: string) {
		return await this.prisma.payment.update({
			where: { id },
			data: { status: PaymentStatus.SUCCESS }
		})
	}

	public async markFailed(id: string) {
		return await this.prisma.payment.update({
			where: { id },
			data: { status: PaymentStatus.FAILED }
		})
	}

	public async markRefunded(id: string) {
		return await this.prisma.payment.update({
			where: { id },
			data: { status: PaymentStatus.REFUNDED }
		})
	}

	// TODO: take next methods to it's own repo
	public async findPaymentMethodsByUser(userId: string) {
		return this.prisma.paymentMethod.findMany({
			where: { userId, status: PaymentMethodStatus.ACTIVE },
			orderBy: { createdAt: 'desc' }
		})
	}

	public async findPaymentMethodById(id: string) {
		return await this.prisma.paymentMethod.findUnique({ where: { id } })
	}

	public async findActivePaymentMethod(userId: string, token: string) {
		return await this.prisma.paymentMethod.findFirst({
			where: { userId, token, status: PaymentMethodStatus.ACTIVE }
		})
	}

	public async createPaymentMethod(data: PaymentMethodCreateInput) {
		return await this.prisma.paymentMethod.create({ data })
	}

	public async updatePaymentMethod(id: string, data: PaymentMethodUpdateInput) {
		return await this.prisma.paymentMethod.update({ where: { id }, data })
	}

	public async deletePaymentMethod(id: string) {
		return await this.prisma.paymentMethod.delete({ where: { id } })
	}
}
