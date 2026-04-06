import { Inject, OnModuleInit } from '@nestjs/common'
import type { ClientGrpc } from '@nestjs/microservices'
import type {
	BookingServiceClient,
	CancelBookingRequest,
	ConfirmBookingRequest,
	CreateReservationRequest
} from '@vendee-cinema/contracts/booking'

export class BookingClientGrpc implements OnModuleInit {
	private bookingService: BookingServiceClient

	public constructor(
		@Inject('BOOKING_PACKAGE') private readonly client: ClientGrpc
	) {}

	public onModuleInit() {
		this.bookingService =
			this.client.getService<BookingServiceClient>('BookingService')
	}

	public createReservation(request: CreateReservationRequest) {
		return this.bookingService.createReservation(request)
	}

	public confirmBooking(request: ConfirmBookingRequest) {
		return this.bookingService.confirmBooking(request)
	}

	public cancelBooking(request: CancelBookingRequest) {
		return this.bookingService.cancelBooking(request)
	}
}
