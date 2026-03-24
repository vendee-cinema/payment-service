import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { PrismaModule } from './infra/prisma'

@Module({
	imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule]
})
export class AppModule {}
