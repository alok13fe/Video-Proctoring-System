'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppSelector } from '@/lib/hooks'
import axios from 'axios'

interface Room {
  id: number;
  slug: string;
  candidateId: number | null;
  status: string;
  startTime?: string;
  endTime?: string;
}

export default function AdminHome() {

  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);

  const { profile } = useAppSelector(state => state.admin);

  async function fetchRooms() {
    if(!profile){
      // Add Toast
      return;
    }

    try {
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_BASE_URL}/room/my-rooms`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('admin-token')}`
          }
        }
      )

      setRooms(response.data.data.rooms);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    fetchRooms();
  },[profile]);

  async function createRoom(){
    if(!profile){
      // Add Toast
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BASE_URL}/room/create`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('admin-token')}`
          }
        }
      )

      setRooms(prev => [...prev, response.data.data.room]);
      // router.push(`/room/${response.data.data.roomId}`);
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  }

  return (
    <main>
      <section className='p-5 md:p-10 w-full h-screen bg-gray-100'>
        <div className='container md:flex'>
          <div className='w-full p-5 bg-white shadow-md rounded'>
            <div className='flex justify-between'>
              <div>
                <p className='mb-2 text-3xl font-semibold'>Interview Rooms</p>
                <p className='mb-5 text-gray-700 text-sm'>Monitor and manage all interview sessions</p>
              </div>
              <div>
                <button 
                  className={`px-2 py-1 flex items-center gap-1 bg-black text-white font-semibold border-black border-2 rounded disabled:opacity-75`}
                  onClick={createRoom}
                  disabled={loading}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus-icon lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                  <span>Create Room</span>
                </button>
              </div>
            </div>
            {
              rooms.length !== 0 ?
              <table className='w-full'>
                <thead className='text-gray-600 border-b'>
                  <tr>
                  <th className='w-1/4 py-2 font-semibold text-left'>Room ID</th>
                  <th className='w-1/4 py-2 font-semibold text-left'>Candidate</th>
                  <th className='w-1/4 py-2 font-semibold text-left'>Status</th>
                  <th className='w-1/4 py-2 font-semibold text-left'>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {
                    rooms.map((room) => {
                      return (
                        <tr key={room.id} className='hover:bg-gray-100'>
                          <td className='py-2'>{room.slug}</td>
                          <td className='py-2'>{room.candidateId === null ? 'Not Assigned' : room.candidateId}</td>
                          <td className='py-2'>{room.status}</td>
                          <td className='py-2'>
                            {
                              room.status === "COMPLETED" ?
                              <button 
                                className='px-2 py-1 bg-gray-100 font-semibold border-gray-400 border rounded hover:bg-black hover:text-white'
                                onClick={() => {router.push(`/admin/report?roomId=${room.slug}&candidateId=${room.candidateId}`)}}
                              >
                                View Report
                              </button>
                              :
                              <button 
                                className='px-2 py-1 bg-gray-100 font-semibold border-gray-400 border rounded hover:bg-black hover:text-white'
                                onClick={() => {router.push(`/admin/interview/${room.slug}`)}}
                              >
                                Join
                              </button>
                            }
                          </td>
                        </tr>
                      )
                    })
                  }
                </tbody>
              </table>
              :
              <div className='py-10 w-full text-center'>
              <p className='text-gray-700'>No rooms found</p>
              </div>     
            }
          </div>
        </div>
      </section>
    </main>
  )
}
