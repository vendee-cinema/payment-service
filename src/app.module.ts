import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { LiqPayModule } from 'liqpay-nestjs'

import { getLiqPayConfig } from './config'
import { PrismaModule } from './infra/prisma'
import { PaymentModule } from './modules/payment'
import { RefundModule } from './modules/refund'

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		PrismaModule,
		LiqPayModule.forRootAsync({
			useFactory: getLiqPayConfig,
			inject: [ConfigService],
			isGlobal: true
		}),
		RefundModule,
		PaymentModule
	]
})
export class AppModule {}
