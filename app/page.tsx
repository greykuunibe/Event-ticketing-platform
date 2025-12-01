"use client"
import Link from 'next/link'
import { TicketIcon } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

export default function Home() {
  return (
    <div className="min-h-screen flex items-start px-2 md:px-0 pt-16 justify-center">
      <div className='bg-white border border-zinc-200 rounded-lg p-6 space-y-6'>
        {/* note */}
        <div className='text-xs text-zinc-500 bg-zinc-100 rounded-full px-2 py-1 w-fit'><p>stc.pyc | version 1.0</p></div>
        {/* hero text */}
        <div className='w-full md:max-w-2/3 space-y-6'>
          <h1 className='text-5xl font-medium w-full tracking-tighter'>The better way to <br className='hidden md:block' /> manage your events</h1>
          <p className='text-zinc-500 w-full md:w-2/3'>A lightweight ticketing solution for small communities who want to manage their events easily and securely.</p>
        </div>
        {/* call to actions */}
        <div className="space-y-3 w-full md:w-2/3 flex flex-col">
          <motion.div
            whileTap={{ scale: 0.95 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <Link 
              href="/auth/signin?callbackUrl=/admin/dashboard" 
              className='flex items-center justify-center gap-2 w-full bg-linear-to-br from-zinc-900 to-zinc-700 border border-zinc-200 text-center text-white px-4 py-2 rounded-xl active:opacity-80'
            > 
              <TicketIcon size={20} weight="fill" /> Login to your account
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}