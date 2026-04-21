import { useState } from "react";

export function ToggleButton({ defaultOn = false, onChange }) {
  const [isOn, setIsOn] = useState(defaultOn);

  const handleToggle = () => {
    setIsOn(!isOn);
    if (onChange) onChange(!isOn);
  };

  return (
    <button
      onClick={handleToggle}
      className={`w-8 h-4 flex items-center rounded-full p-1 transition-colors duration-300 focus:outline-none cursor-pointer ${
        isOn ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <div
        className={`bg-white w-2 h-2 rounded-full shadow-md transform transition-transform duration-300 ${
          isOn ? "translate-x-4" : ""
        }`}
      ></div>
    </button>
  );
}
