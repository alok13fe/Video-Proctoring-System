'use client'
import { useState } from "react"
import SignIn from "./SignIn"
import SignUp from "./SignUp"

interface AuthContainerProps {
  role: string;
  onClose: () => void;
}

export default function AuthContainer({ role, onClose }: AuthContainerProps){
  const [page, setPage] = useState('signin');
  
  return(
    <div className="glass-card fixed inset-0 z-20 bg-[rgba(230,228,228,0.15)] backdrop-blur-[3px] flex items-center justify-center pointer-events-auto">
      {
        page === 'signin' ?
        <SignIn role={role} setPage={setPage} onClose={onClose} />
        :
        <SignUp role={role} setPage={setPage} onClose={onClose}/>
      }
    </div>
  )
}