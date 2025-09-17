import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type AdminProfile = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AdminState {
  profile: AdminProfile | null
}

const initialState: AdminState = {
  profile: null
}

export const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setAdminProfile: (state, action) => {
      state.profile = action.payload;
    }
  }
})

export const { setAdminProfile } = adminSlice.actions

export default adminSlice.reducer