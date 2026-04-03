import { Module } from '@nestjs/common'

import { RefundModule } from '../refund'

import { PaymentController } from './payment.controller'
import { PaymentRepository } from './payment.repository'
import { PaymentService } from './payment.service'

@Module({
	imports: [RefundModule],
	controllers: [PaymentController],
	providers: [PaymentService, PaymentRepository]
})
export class PaymentModule {}
