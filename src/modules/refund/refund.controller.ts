import { Controller } from '@nestjs/common'
import { GrpcMethod } from '@nestjs/microservices'
import type {
	CreateRefundRequest,
	CreateRefundResponse
} from '@vendee-cinema/contracts/refund'

import { RefundService } from './refund.service'

@Controller()
export class RefundController {
	public constructor(private readonly refundService: RefundService) {}

	@GrpcMethod('RefundService', 'createRefund')
	public async create(
		data: CreateRefundRequest
	): Promise<CreateRefundResponse> {
		return this.refundService.create(data)
	}
}
