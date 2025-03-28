import { users, vehicles, rides, ratings, type User, type InsertUser, type Vehicle, type InsertVehicle, type Ride, type InsertRide, type Rating, type InsertRating } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Interface for all storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User>;
  updateUserStatus(id: number, isOnline: boolean): Promise<User>;
  
  // Vehicle operations
  getVehicle(id: number): Promise<Vehicle | undefined>;
  getVehicleByDriver(driverId: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicleData: Partial<Vehicle>): Promise<Vehicle>;
  
  // Ride operations
  getRide(id: number): Promise<Ride | undefined>;
  getActiveRideForUser(userId: number): Promise<Ride | undefined>;
  getDriverActiveRide(driverId: number): Promise<Ride | undefined>;
  getPassengerActiveRide(passengerId: number): Promise<Ride | undefined>;
  getUserRides(userId: number, limit?: number): Promise<Ride[]>;
  createRide(ride: InsertRide): Promise<Ride>;
  acceptRide(rideId: number, driverId: number): Promise<Ride>;
  declineRide(rideId: number): Promise<Ride>;
  markDriverArrived(rideId: number): Promise<Ride>;
  startRide(rideId: number): Promise<Ride>;
  completeRide(rideId: number): Promise<Ride>;
  cancelRide(rideId: number): Promise<Ride>;
  
  // Rating operations
  getRating(id: number): Promise<Rating | undefined>;
  getUserRatings(userId: number): Promise<Rating[]>;
  createRating(rating: InsertRating): Promise<Rating>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private usersMap: Map<number, User>;
  private vehiclesMap: Map<number, Vehicle>;
  private ridesMap: Map<number, Ride>;
  private ratingsMap: Map<number, Rating>;
  private userIdCounter: number;
  private vehicleIdCounter: number;
  private rideIdCounter: number;
  private ratingIdCounter: number;
  public sessionStore: session.SessionStore;

  constructor() {
    this.usersMap = new Map();
    this.vehiclesMap = new Map();
    this.ridesMap = new Map();
    this.ratingsMap = new Map();
    this.userIdCounter = 1;
    this.vehicleIdCounter = 1;
    this.rideIdCounter = 1;
    this.ratingIdCounter = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24h
    });
    
    // Seed with a test user for easier demo
    this.createUser({
      username: "test",
      password: "$2a$10$3Nh1O1pFQTspJZJKi4RhwOsqLu9FwfIuEzLOYX5Nb9hU11Vrf0Siy.salt", // "password" hashed
      fullName: "Test User",
      email: "test@example.com",
      phone: "555-1234",
      profilePicture: "",
      userType: "passenger",
      language: "pt",
      isOnline: false
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.usersMap.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersMap.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = {
      ...userData,
      id,
      createdAt: now
    };
    this.usersMap.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, ...userData };
    this.usersMap.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserStatus(id: number, isOnline: boolean): Promise<User> {
    return this.updateUser(id, { isOnline });
  }

  // Vehicle operations
  async getVehicle(id: number): Promise<Vehicle | undefined> {
    return this.vehiclesMap.get(id);
  }

  async getVehicleByDriver(driverId: number): Promise<Vehicle | undefined> {
    return Array.from(this.vehiclesMap.values()).find(
      (vehicle) => vehicle.driverId === driverId
    );
  }

  async createVehicle(vehicleData: InsertVehicle): Promise<Vehicle> {
    const id = this.vehicleIdCounter++;
    const vehicle: Vehicle = {
      ...vehicleData,
      id
    };
    this.vehiclesMap.set(id, vehicle);
    return vehicle;
  }

  async updateVehicle(id: number, vehicleData: Partial<Vehicle>): Promise<Vehicle> {
    const vehicle = await this.getVehicle(id);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }
    
    const updatedVehicle = { ...vehicle, ...vehicleData };
    this.vehiclesMap.set(id, updatedVehicle);
    return updatedVehicle;
  }

  // Ride operations
  async getRide(id: number): Promise<Ride | undefined> {
    return this.ridesMap.get(id);
  }

  async getActiveRideForUser(userId: number): Promise<Ride | undefined> {
    // A ride is active if it's in requested, accepted, or in_progress status
    return Array.from(this.ridesMap.values()).find(
      (ride) => 
        (ride.passengerId === userId || ride.driverId === userId) &&
        ['requested', 'accepted', 'in_progress'].includes(ride.status)
    );
  }

  async getDriverActiveRide(driverId: number): Promise<Ride | undefined> {
    return Array.from(this.ridesMap.values()).find(
      (ride) => 
        ride.driverId === driverId &&
        ['accepted', 'in_progress'].includes(ride.status)
    );
  }

  async getPassengerActiveRide(passengerId: number): Promise<Ride | undefined> {
    return Array.from(this.ridesMap.values()).find(
      (ride) => 
        ride.passengerId === passengerId &&
        ['requested', 'accepted', 'in_progress'].includes(ride.status)
    );
  }

  async getUserRides(userId: number, limit: number = 10): Promise<Ride[]> {
    return Array.from(this.ridesMap.values())
      .filter(
        (ride) => ride.passengerId === userId || ride.driverId === userId
      )
      .sort((a, b) => {
        // Sort by most recent first
        const aDate = a.requestedAt?.getTime() || 0;
        const bDate = b.requestedAt?.getTime() || 0;
        return bDate - aDate;
      })
      .slice(0, limit);
  }

  async createRide(rideData: InsertRide): Promise<Ride> {
    // Check if passenger already has an active ride
    const existingRide = await this.getPassengerActiveRide(rideData.passengerId!);
    if (existingRide) {
      throw new Error("Passenger already has an active ride");
    }
    
    const id = this.rideIdCounter++;
    const now = new Date();
    
    const ride: Ride = {
      ...rideData,
      id,
      status: 'requested',
      requestedAt: now
    };
    
    this.ridesMap.set(id, ride);
    return ride;
  }

  async acceptRide(rideId: number, driverId: number): Promise<Ride> {
    const ride = await this.getRide(rideId);
    if (!ride) {
      throw new Error("Ride not found");
    }
    
    if (ride.status !== 'requested') {
      throw new Error("Ride is not in requested status");
    }
    
    // Check if driver already has an active ride
    const existingRide = await this.getDriverActiveRide(driverId);
    if (existingRide) {
      throw new Error("Driver already has an active ride");
    }
    
    const now = new Date();
    const updatedRide: Ride = {
      ...ride,
      driverId,
      status: 'accepted',
      acceptedAt: now
    };
    
    this.ridesMap.set(rideId, updatedRide);
    return updatedRide;
  }

  async declineRide(rideId: number): Promise<Ride> {
    const ride = await this.getRide(rideId);
    if (!ride) {
      throw new Error("Ride not found");
    }
    
    if (ride.status !== 'requested') {
      throw new Error("Ride is not in requested status");
    }
    
    // Mark as cancelled
    const now = new Date();
    const updatedRide: Ride = {
      ...ride,
      status: 'cancelled',
      cancelledAt: now
    };
    
    this.ridesMap.set(rideId, updatedRide);
    return updatedRide;
  }

  async markDriverArrived(rideId: number): Promise<Ride> {
    const ride = await this.getRide(rideId);
    if (!ride) {
      throw new Error("Ride not found");
    }
    
    if (ride.status !== 'accepted') {
      throw new Error("Ride is not in accepted status");
    }
    
    // This is just a notification state, we don't change the ride status
    // but in a real app we might add an "arrived" field
    return ride;
  }

  async startRide(rideId: number): Promise<Ride> {
    const ride = await this.getRide(rideId);
    if (!ride) {
      throw new Error("Ride not found");
    }
    
    if (ride.status !== 'accepted') {
      throw new Error("Ride is not in accepted status");
    }
    
    const now = new Date();
    const updatedRide: Ride = {
      ...ride,
      status: 'in_progress',
      startedAt: now
    };
    
    this.ridesMap.set(rideId, updatedRide);
    return updatedRide;
  }

  async completeRide(rideId: number): Promise<Ride> {
    const ride = await this.getRide(rideId);
    if (!ride) {
      throw new Error("Ride not found");
    }
    
    if (ride.status !== 'in_progress') {
      throw new Error("Ride is not in progress");
    }
    
    const now = new Date();
    const updatedRide: Ride = {
      ...ride,
      status: 'completed',
      completedAt: now
    };
    
    this.ridesMap.set(rideId, updatedRide);
    return updatedRide;
  }

  async cancelRide(rideId: number): Promise<Ride> {
    const ride = await this.getRide(rideId);
    if (!ride) {
      throw new Error("Ride not found");
    }
    
    if (!['requested', 'accepted', 'in_progress'].includes(ride.status)) {
      throw new Error("Ride cannot be cancelled");
    }
    
    const now = new Date();
    const updatedRide: Ride = {
      ...ride,
      status: 'cancelled',
      cancelledAt: now
    };
    
    this.ridesMap.set(rideId, updatedRide);
    return updatedRide;
  }

  // Rating operations
  async getRating(id: number): Promise<Rating | undefined> {
    return this.ratingsMap.get(id);
  }

  async getUserRatings(userId: number): Promise<Rating[]> {
    return Array.from(this.ratingsMap.values())
      .filter(
        (rating) => rating.toUserId === userId
      )
      .sort((a, b) => {
        // Sort by most recent first
        const aDate = a.createdAt?.getTime() || 0;
        const bDate = b.createdAt?.getTime() || 0;
        return bDate - aDate;
      });
  }

  async createRating(ratingData: InsertRating): Promise<Rating> {
    const id = this.ratingIdCounter++;
    const now = new Date();
    
    const rating: Rating = {
      ...ratingData,
      id,
      createdAt: now
    };
    
    this.ratingsMap.set(id, rating);
    return rating;
  }
}

export const storage = new MemStorage();
