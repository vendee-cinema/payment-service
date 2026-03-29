import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LiqPayModule } from 'liqpay-nestjs'

import { getLiqPayConfig } from '@/config/liqpay.config'

import { PaymentController } from './payment.controller'
import { PaymentRepository } from './payment.repository'
import { PaymentService } from './payment.service'

@Module({
	imports: [
		LiqPayModule.forRootAsync({
			useFactory: getLiqPayConfig,
			inject: [ConfigService]
		})
	],
	controllers: [PaymentController],
	providers: [PaymentService, PaymentRepository]
})
export class PaymentModule {}
