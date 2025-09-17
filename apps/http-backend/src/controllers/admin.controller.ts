import { Request, Response } from "express";
import { prismaClient } from "@repo/db/client";
import { registerSchema, loginSchema } from "@repo/common/schema";
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";

export async function registerAdmin(req:Request, res: Response) {
  try {
    const { firstName, lastName, email, password } = req.body;

    /* Input Validation */
    registerSchema.parse({
      firstName,
      lastName,
      email,
      password
    });

    /* Checking if Admin Already exists */
    const admin = await prismaClient.user.findFirst({
      where: {
        email,
        role: 'ADMIN'
      }
    });

    if(admin){
      res
      .status(409)
      .json({
        message: 'User Already Exists. Please Login!'      
      });
      return;
    }

    /* Hashing Password */
    const hashedPassword = await bcrypt.hash(password, 10);

    /* Registering New User */
    await prismaClient.user.create({
      data: {
        firstName,
        lastName,
        role: 'ADMIN',
        email,
        password: hashedPassword
      }
    });

    res
    .status(201)
    .json({
      success: true,
      message: 'Registeration successful! You can now log in.'
    });
  } catch (error) {
    console.log(error);
    if(error instanceof z.ZodError){
      res
      .status(400)
      .json({
        success: false,
        message: error.issues[0]?.message || "Input Validation Error",
        error: error
      });
      return;
    }
    
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Unable to register user at this time.",
      error: error
    });
  }
}

export async function loginAdmin(req:Request, res: Response) {
  try {
    const {email, password} = req.body;

    /* Input Validation */
    loginSchema.parse({
      email,
      password
    });

    /* Searching Admin from Database */
    const admin = await prismaClient.user.findFirst({
      where: {
        email,
        role: 'ADMIN'
      }
    });

    if(!admin){
      res
      .status(401)
      .json({
        success: false,
        message: "Invalid Credentials"
      });
      return;
    }

    /* Validating Password */
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    admin.password = "";

    if(!isPasswordValid){
      res
      .status(401)
      .json({
        success: false,
        message: "Invalid Credentials"
      });
      return;
    }

    if(!process.env.JWT_SECRET){
      throw new Error('JWT_SECRET is not defined in environment variables.');
    }

    const options:jwt.SignOptions = {};
    if(process.env.JWT_EXPIRY){
      options.expiresIn = parseInt(process.env.JWT_EXPIRY);
    }

    /* Generating JWT Token */
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email
      },
      process.env.JWT_SECRET,
      options
    );

    res
    .status(200)
    .json({
      success: true,
      data: {
        admin, 
        token
      },
      message: 'Login Successful'
    })
  } catch (error) {
    console.log(error);
    if(error instanceof z.ZodError){
      res
      .status(400)
      .json({
        success: false,
        message: error.issues[0]?.message || "Input Validation Error",
        error: error
      });
      return;
    }
    
    res
    .status(500)
    .json({
      success: false,
      message: "Server error: Unable to login user at this time.",
      error: error
    });
  }
}

export async function adminProfile(req:Request, res: Response) {
  const admin = await prismaClient.user.findFirst({
    where: {
      id: req.userId
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true
    }
  });

  res
  .status(200)
  .json({
    success: true,
    data: {
      admin
    },
    message: 'Admin Profile Fetched Successfully!'
  });
}