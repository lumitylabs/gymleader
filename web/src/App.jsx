import { useState } from "react";
import React from 'react'
function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <div className="h-screen w-screen">
        <h1 class="text-3xl font-bold underline text-black">Hello world!</h1>
      </div>
    </>
  );
}

export default App;
