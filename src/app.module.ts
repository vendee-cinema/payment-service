import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { PrismaModule } from './infra/prisma'
import { PaymentModule } from './modules/payment'

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		PrismaModule,
		PaymentModule
	]
})
export class AppModule {}
