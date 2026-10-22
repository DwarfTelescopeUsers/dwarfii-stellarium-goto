import React, { JSX } from "react";
import {
  Sun,
  Moon,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  CloudFog,
} from "lucide-react";

interface WeatherIconProps {
  icon: string;
  size?: number;
}

const WeatherIcon: React.FC<WeatherIconProps> = ({ icon, size = 62 }) => {
  const iconMapping: Record<string, JSX.Element> = {
    "01d": <Sun size={size} />,
    "01n": <Moon size={size} />,
    "02d": <Cloud size={size} />,
    "02n": <Cloud size={size} />,
    "03d": <Cloud size={size} />,
    "03n": <Cloud size={size} />,
    "04d": <Cloud size={size} />,
    "04n": <Cloud size={size} />,
    "09d": <CloudRain size={size} />,
    "09n": <CloudRain size={size} />,
    "10d": <CloudRain size={size} />,
    "10n": <CloudRain size={size} />,
    "11d": <CloudLightning size={size} />,
    "11n": <CloudLightning size={size} />,
    "13d": <CloudSnow size={size} />,
    "13n": <CloudSnow size={size} />,
    "50d": <CloudFog size={size} />,
    "50n": <CloudFog size={size} />,
  };

  return iconMapping[icon] || <Wind size={size} />;
};

export default WeatherIcon;
