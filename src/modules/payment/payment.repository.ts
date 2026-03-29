import { Injectable } from '@nestjs/common'
import type {
	PaymentCreateInput,
	PaymentUpdateInput
} from '@prisma/generated/models'

import { PrismaService } from '@/infra/prisma'

@Injectable()
export class PaymentRepository {
	public constructor(private readonly prisma: PrismaService) {}

	public async findById(id: string) {
		return await this.prisma.payment.findUnique({ where: { id } })
	}

	public async create(data: PaymentCreateInput) {
		return await this.prisma.payment.create({ data })
	}

	public async update(id: string, data: PaymentUpdateInput) {
		return await this.prisma.payment.update({ where: { id }, data })
	}
}
