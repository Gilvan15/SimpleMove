import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { insertRideSchema, insertRatingSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Passenger routes
  
  // Get active ride for the current user
  app.get("/api/rides/active", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const activeRide = await storage.getActiveRideForUser(req.user.id);
      if (!activeRide) {
        return res.status(404).json({ message: "No active ride found" });
      }
      res.json(activeRide);
    } catch (error) {
      res.status(500).json({ message: "Error fetching active ride" });
    }
  });

  // Create a new ride request
  app.post("/api/rides", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const rideData = insertRideSchema.parse({
        ...req.body,
        passengerId: req.user.id,
      });
      
      const ride = await storage.createRide(rideData);
      res.status(201).json(ride);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid ride data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating ride" });
    }
  });

  // Cancel a ride
  app.patch("/api/rides/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const rideId = parseInt(req.params.id);
      const ride = await storage.getRide(rideId);
      
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      
      // Check if the user is the passenger or driver of this ride
      if (ride.passengerId !== req.user.id && ride.driverId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to cancel this ride" });
      }
      
      const cancelledRide = await storage.cancelRide(rideId);
      res.json(cancelledRide);
    } catch (error) {
      res.status(500).json({ message: "Error cancelling ride" });
    }
  });

  // Driver routes
  
  // Accept a ride
  app.patch("/api/rides/:id/accept", async (req, res) => {
    if (!req.isAuthenticated() || req.user.userType !== 'driver') {
      return res.sendStatus(401);
    }
    
    try {
      const rideId = parseInt(req.params.id);
      const ride = await storage.getRide(rideId);
      
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      
      if (ride.status !== 'requested') {
        return res.status(400).json({ message: "Ride is not in requested status" });
      }
      
      const acceptedRide = await storage.acceptRide(rideId, req.user.id);
      res.json(acceptedRide);
    } catch (error) {
      res.status(500).json({ message: "Error accepting ride" });
    }
  });

  // Decline a ride
  app.patch("/api/rides/:id/decline", async (req, res) => {
    if (!req.isAuthenticated() || req.user.userType !== 'driver') {
      return res.sendStatus(401);
    }
    
    try {
      const rideId = parseInt(req.params.id);
      const ride = await storage.getRide(rideId);
      
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      
      if (ride.status !== 'requested') {
        return res.status(400).json({ message: "Ride is not in requested status" });
      }
      
      const declinedRide = await storage.declineRide(rideId);
      res.json(declinedRide);
    } catch (error) {
      res.status(500).json({ message: "Error declining ride" });
    }
  });

  // Driver arrived at pickup location
  app.patch("/api/rides/:id/arrived", async (req, res) => {
    if (!req.isAuthenticated() || req.user.userType !== 'driver') {
      return res.sendStatus(401);
    }
    
    try {
      const rideId = parseInt(req.params.id);
      const ride = await storage.getRide(rideId);
      
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      
      if (ride.status !== 'accepted' || ride.driverId !== req.user.id) {
        return res.status(400).json({ message: "Cannot mark arrival for this ride" });
      }
      
      const arrivedRide = await storage.markDriverArrived(rideId);
      res.json(arrivedRide);
    } catch (error) {
      res.status(500).json({ message: "Error marking arrival" });
    }
  });

  // Start ride
  app.patch("/api/rides/:id/start", async (req, res) => {
    if (!req.isAuthenticated() || req.user.userType !== 'driver') {
      return res.sendStatus(401);
    }
    
    try {
      const rideId = parseInt(req.params.id);
      const ride = await storage.getRide(rideId);
      
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      
      if (ride.status !== 'accepted' || ride.driverId !== req.user.id) {
        return res.status(400).json({ message: "Cannot start this ride" });
      }
      
      const startedRide = await storage.startRide(rideId);
      res.json(startedRide);
    } catch (error) {
      res.status(500).json({ message: "Error starting ride" });
    }
  });

  // Complete ride
  app.patch("/api/rides/:id/complete", async (req, res) => {
    if (!req.isAuthenticated() || req.user.userType !== 'driver') {
      return res.sendStatus(401);
    }
    
    try {
      const rideId = parseInt(req.params.id);
      const ride = await storage.getRide(rideId);
      
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      
      if (ride.status !== 'in_progress' || ride.driverId !== req.user.id) {
        return res.status(400).json({ message: "Cannot complete this ride" });
      }
      
      const completedRide = await storage.completeRide(rideId);
      res.json(completedRide);
    } catch (error) {
      res.status(500).json({ message: "Error completing ride" });
    }
  });

  // Submit rating
  app.post("/api/ratings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const ratingData = insertRatingSchema.parse({
        ...req.body,
        fromUserId: req.user.id,
      });
      
      // Verify the ride exists and the user is associated with it
      const ride = await storage.getRide(ratingData.rideId);
      if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
      }
      
      if (ride.passengerId !== req.user.id && ride.driverId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to rate this ride" });
      }
      
      // Determine the user being rated
      const toUserId = req.user.id === ride.passengerId ? ride.driverId! : ride.passengerId!;
      const rating = await storage.createRating({
        ...ratingData,
        toUserId,
      });
      
      res.status(201).json(rating);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid rating data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Error creating rating" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
