'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/lib/hooks';
import Navbar from '@/components/Navbar'

export default function Home() {

  const router = useRouter();

  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  const { profile } = useAppSelector(state => state.user);
  
  async function handleJoinRoom(){
    if(!profile){
      setError('Please Login!');
      return;
    }

    router.push(`/interview/${roomId}`);
  }

  return (
    <>
      <Navbar />
      <main>
        <section className='p-5 md:p-10 w-full min-h-[calc(100vh-60px)] bg-gray-100'>
          <div className='container md:flex'>
            <div className='p-5 bg-white shadow-md rounded'>
              <p className='mb-2 text-3xl font-semibold'>Join Interview Room</p>
              <p className='mb-5 text-gray-700 text-sm'>Enter your room ID to begin the proctured interview session</p>
              <div className={`${error ? 'mb-3' : 'mb-5'} space-y-2`}>
                <label className='block font-semibold'>Room ID</label>
                <input 
                  className='px-3 py-2 w-full outline-0 border border-gray-400 rounded' 
                  type='text' 
                  placeholder='Enter Room ID'
                  onChange={(e) => {setRoomId(e.target.value)}}
                />
              </div>
              
              {
                error &&
                <div className='mb-3 flex items-center gap-2 text-xs text-red-600'>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-info-icon lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                  <span>{error}</span>
                </div>
              }
              
              <button 
                className={`w-full px-3 py-1.5 bg-black text-white font-semibold border-black border-2 rounded disabled:opacity-75`} 
                onClick={handleJoinRoom}
                disabled={!roomId}
                >
                Join Interview
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
