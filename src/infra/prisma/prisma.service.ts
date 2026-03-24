import {
	Injectable,
	Logger,
	type OnModuleDestroy,
	type OnModuleInit
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/generated/client'

@Injectable()
export class PrismaService
	extends PrismaClient
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(PrismaService.name)

	public constructor(private readonly configService: ConfigService) {
		const adapter = new PrismaPg({
			user: configService.getOrThrow<string>('DATABASE_USER'),
			password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
			host: configService.getOrThrow<string>('DATABASE_HOST'),
			port: configService.getOrThrow<number>('DATABASE_PORT'),
			database: configService.getOrThrow<string>('DATABASE_NAME')
		})
		super({ adapter })
	}

	public async onModuleInit() {
		const start = Date.now()
		this.logger.log('Connecting to database...')
		try {
			await this.$connect()
			const ms = Date.now() - start
			this.logger.log(`Database connection established in ${ms}ms`)
		} catch (error) {
			this.logger.error('Failed to connect to database: ', error)
			throw error
		}
	}

	public async onModuleDestroy() {
		this.logger.log('Disconnecting from database...')
		try {
			await this.$disconnect()
			this.logger.log('Database connection closed')
		} catch (error) {
			this.logger.error('Failed to disconnect from database: ', error)
			throw error
		}
	}
}
