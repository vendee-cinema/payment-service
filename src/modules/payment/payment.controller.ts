import { Controller } from '@nestjs/common'
import { GrpcMethod } from '@nestjs/microservices'
import type {
	CreatePaymentMethodRequest,
	CreatePaymentMethodResponse,
	CreatePaymentRequest,
	CreatePaymentResponse,
	DeletePaymentMethodRequest,
	DeletePaymentMethodResponse,
	GetPaymentStatusRequest,
	GetPaymentStatusResponse,
	GetUserPaymentMethodsRequest,
	GetUserPaymentMethodsResponse,
	ProcessPaymentEventRequest,
	ProcessPaymentEventResponse,
	VerifyPaymentMethodRequest,
	VerifyPaymentMethodResponse
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
		return await this.paymentService.processPaymentEvent(data)
	}

	@GrpcMethod('PaymentService', 'GetPaymentStatus')
	public async getStatus(
		data: GetPaymentStatusRequest
	): Promise<GetPaymentStatusResponse> {
		return await this.paymentService.getStatusWithApi(data)
	}

	@GrpcMethod('PaymentService', 'GetUserPaymentMethods')
	public async getUserPaymentMethods(
		data: GetUserPaymentMethodsRequest
	): Promise<GetUserPaymentMethodsResponse> {
		return await this.paymentService.getUserPaymentMethods(data)
	}

	@GrpcMethod('PaymentService', 'CreatePaymentMethod')
	public async createPaymentMethod(
		data: CreatePaymentMethodRequest
	): Promise<CreatePaymentMethodResponse> {
		return await this.paymentService.createPaymentMethod(data)
	}

	@GrpcMethod('PaymentService', 'VerifyPaymentMethod')
	public async verifyPaymentMethod(
		data: VerifyPaymentMethodRequest
	): Promise<VerifyPaymentMethodResponse> {
		return await this.paymentService.verifyPaymentMethod(data)
	}

	@GrpcMethod('PaymentService', 'DeletePaymentMethod')
	public async deletePaymentMethod(
		data: DeletePaymentMethodRequest
	): Promise<DeletePaymentMethodResponse> {
		return await this.paymentService.deletePaymentMethod(data)
	}
}
