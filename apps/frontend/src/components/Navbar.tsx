'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useAppSelector } from '@/lib/hooks'
import AuthContainer from './AuthContainer'

export default function Navbar() {

  const { profile } = useAppSelector(state => state.user);

  const [authContainer, setAuthContainer] = useState<boolean>(false);

  return (
    <>
      <nav className='py-3 border-b border-gray-300'>
        <div className='w-full container flex justify-between items-center'>
          <div>
            <Link href='/' className='text-xl font-bold'>Proctor</Link>
          </div>
          <div className='hidden md:flex justify-between gap-10'>
            <p>Interviews</p>
            <p>Account</p>
            <p>Support</p>
            <p>About</p>
          </div>
          <div>
            {
              profile ?
              <div className='p-1 border rounded-full'>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-icon lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              :
              <button 
                className='px-3 py-1 font-medium border-2 rounded'
                onClick={() => {setAuthContainer(true)}}
              >
                Get Started
              </button>
            }
          </div>
        </div>
      </nav>
      {
        authContainer &&
        <AuthContainer role='user' onClose={() => setAuthContainer(false)} />
      }
    </>
  )
}
