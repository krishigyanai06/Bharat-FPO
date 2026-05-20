import { createAsyncThunk } from '@reduxjs/toolkit';

// Mock data storage (in-memory, resets on page refresh)
let mockCoupons = [
  {
    _id: 'mock_1',
    code: 'SAVE20',
    discountType: 'PERCENTAGE',
    discountValue: 20,
    maxDiscount: 500,
    minOrderAmount: 1000,
    validFrom: '2025-01-01',
    validUntil: '2025-12-31',
  },
  {
    _id: 'mock_2',
    code: 'FLAT500',
    discountType: 'FLAT',
    discountValue: 500,
    minOrderAmount: 2000,
    validFrom: '2025-01-01',
    validUntil: '2025-12-31',
  },
  {
    _id: 'mock_3',
    code: 'OLD2024',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    validFrom: '2024-01-01',
    validUntil: '2024-12-31',
  },
];

// Simulate API delay
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchCoupons = createAsyncThunk(
  'coupons/fetchCoupons',
  async (_, { rejectWithValue }) => {
    try {
      console.log('🔄 Fetching coupons (MOCK)...');
      await delay(500); // Simulate network delay
      console.log('✅ Fetch coupons success (MOCK):', mockCoupons);
      return mockCoupons;
    } catch (error) {
      console.error('❌ Fetch coupons error:', error);
      return rejectWithValue('Failed to fetch coupons');
    }
  }
);

export const createCoupon = createAsyncThunk(
  'coupons/createCoupon',
  async (couponData, { rejectWithValue }) => {
    try {
      console.log('🔄 Creating coupon (MOCK):', couponData);
      await delay(500); // Simulate network delay
      
      const newCoupon = {
        _id: `mock_${Date.now()}`,
        ...couponData,
      };
      
      // Create new array with added coupon
      mockCoupons = [...mockCoupons, newCoupon];
      console.log('✅ Coupon created (MOCK):', newCoupon);
      return newCoupon;
    } catch (error) {
      console.error('❌ Create coupon error:', error);
      return rejectWithValue('Failed to create coupon');
    }
  }
);

export const updateCoupon = createAsyncThunk(
  'coupons/updateCoupon',
  async ({ id, couponData }, { rejectWithValue }) => {
    try {
      console.log('🔄 Updating coupon (MOCK):', id, couponData);
      await delay(500);
      
      const index = mockCoupons.findIndex((c) => c._id === id);
      if (index === -1) {
        throw new Error('Coupon not found');
      }
      
      // Create updated coupon
      const updatedCoupon = { ...mockCoupons[index], ...couponData };
      
      // Replace the array with updated version
      mockCoupons = mockCoupons.map((c) => 
        c._id === id ? updatedCoupon : c
      );
      
      console.log('✅ Coupon updated (MOCK):', updatedCoupon);
      return updatedCoupon;
    } catch (error) {
      console.error('❌ Update coupon error:', error);
      return rejectWithValue('Failed to update coupon');
    }
  }
);

export const deleteCoupon = createAsyncThunk(
  'coupons/deleteCoupon',
  async (id, { rejectWithValue }) => {
    try {
      console.log('🔄 Deleting coupon (MOCK):', id);
      await delay(500);
      
      const index = mockCoupons.findIndex((c) => c._id === id);
      if (index === -1) {
        throw new Error('Coupon not found');
      }
      
      // Filter out the coupon instead of splice
      mockCoupons = mockCoupons.filter((c) => c._id !== id);
      console.log('✅ Coupon deleted (MOCK)');
      return { id };
    } catch (error) {
      console.error('❌ Delete coupon error:', error);
      return rejectWithValue('Failed to delete coupon');
    }
  }
);
