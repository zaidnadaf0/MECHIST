export interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    plate: string;
    type: 'car' | 'bike' | 'van' | 'truck';
}
export interface ServiceRequest {
    id: string;
    customerId: string;
    vehicleId: string;
    problemText: string;
    problemCategory?: string;
    status: 'requested' | 'accepted' | 'on-the-way' | 'arrived' | 'service' | 'completed' | 'cancelled';
    customerLat: number;
    customerLng: number;
    mechanicId?: string | null;
    mechanicName?: string | null;
    /** Assigned mechanic's contact number, denormalized server-side on
     *  accept (admin SDK reads private/contact). Lets the customer call
     *  without ever reading the mechanics collection. Cleared on rematch. */
    mechanicPhone?: string | null;
    mechanicLat?: number | null;
    mechanicLng?: number | null;
    etaMin?: number;
    pickedMechanicId?: string;
    offerExpiresAt?: number;
    declinedBy?: string[];
    releaseReason?: string;
    cancellationReason?: string;
    rating?: number;
    comment?: string;
    /** Set by the rating-aggregation trigger after folding `rating` into the
     *  mechanic profile. Prevents double-counting on function retries. */
    ratingAggregated?: boolean;
    createdAt: number;
    updatedAt: number;
    cancelledAt?: number;
    cancelledBy?: string;
    ratedAt?: number;
    releasedAt?: number;
}
export interface MechanicProfile {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    verificationStatus?: 'pending' | 'under_review' | 'approved' | 'rejected';
    approved: boolean;
    specialties: string[];
    vehicleTypes?: string[];
    experienceYears?: number;
    serviceRadiusKm?: number;
    isAvailable: boolean;
    rating?: number;
    reviewCount?: number;
    vehicleDescription?: string;
    garageName?: string;
    garageAddress?: string;
    currentLat?: number;
    currentLng?: number;
    locationUpdatedAt?: number;
    baseLat?: number;
    baseLng?: number;
}
export interface UserProfile {
    uid: string;
    email: string;
    role: 'customer' | 'mechanic' | 'admin';
    createdAt: number;
}
//# sourceMappingURL=types.d.ts.map