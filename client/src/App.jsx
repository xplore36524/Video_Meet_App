import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { BrowserRouter, Route, Routes} from 'react-router-dom'
import CreateRoom from './components/CreateRoom'
import Room from './components/Room'

function App() {
  return (
    <>
      <div>
        hello
        <BrowserRouter>
          <Routes>
            <Route path="/" exact element={<CreateRoom />} />
            <Route path="/room/:roomID" element={<Room />} />
          </Routes>
        </BrowserRouter>
      </div> 
    </>
  )
}

export default App
