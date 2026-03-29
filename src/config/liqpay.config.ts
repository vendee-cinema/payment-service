import { ConfigService } from '@nestjs/config'
import { LiqPayOptions } from 'liqpay-nestjs'

export function getLiqPayConfig(configService: ConfigService): LiqPayOptions {
	return {
		publicKey: configService.getOrThrow<string>('LIQPAY_PUBLIC_KEY'),
		privateKey: configService.getOrThrow<string>('LIQPAY_PRIVATE_KEY'),
		serverUrl: configService.getOrThrow<string>('LIQPAY_SERVER_URL'),
		resultUrl: configService.getOrThrow<string>('LIQPAY_RESULT_URL')
	}
}
