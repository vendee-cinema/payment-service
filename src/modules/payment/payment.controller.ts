import { Controller } from '@nestjs/common'
import { GrpcMethod } from '@nestjs/microservices'
import {
	CreatePaymentRequest,
	CreatePaymentResponse,
	GetPaymentStatusRequest,
	GetPaymentStatusResponse,
	ProcessPaymentEventRequest,
	ProcessPaymentEventResponse
} from '@vendee-cinema/contracts/payment'

import { PaymentService } from './payment.service'

@Controller('payments')
export class PaymentController {
	public constructor(private readonly paymentService: PaymentService) {}

	@GrpcMethod('PaymentService', 'CreatePayment')
	public async create(
		data: CreatePaymentRequest
	): Promise<CreatePaymentResponse> {
		return this.paymentService.create(data)
	}

	@GrpcMethod('PaymentService', 'ProcessPaymentEvent')
	public async processEvent(
		data: ProcessPaymentEventRequest
	): Promise<ProcessPaymentEventResponse> {
		return await this.paymentService.processEvent(data)
	}

	@GrpcMethod('PaymentService', 'GetPaymentStatus')
	public async getStatus(
		data: GetPaymentStatusRequest
	): Promise<GetPaymentStatusResponse> {
		return await this.paymentService.getStatusWithApi(data)
	}
}
