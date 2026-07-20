/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  Wind,
  CloudFog,
  MapPin,
  Calendar,
  Search,
  Thermometer,
  Droplets,
  Umbrella,
  Compass,
  Sparkles,
  RefreshCw,
  Sliders,
  Send,
  X,
  AlertTriangle,
  Flame,
  Check,
  Shield,
  Car
} from 'lucide-react';

// Interfaces for Open-Meteo Data
interface City {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  country_code?: string;
  admin1?: string;
  timezone: string;
}

interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    uv_index_max: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
  };
}

// Famous Cities for quick select
const QUICK_CITIES: City[] = [
  { id: 2643743, name: "London", latitude: 51.5085, longitude: -0.1257, country: "United Kingdom", country_code: "GB", timezone: "Europe/London" },
  { id: 5128581, name: "New York", latitude: 40.7128, longitude: -74.0060, country: "United States", country_code: "US", timezone: "America/New_York" },
  { id: 1850147, name: "Tokyo", latitude: 35.6895, longitude: 139.6917, country: "Japan", country_code: "JP", timezone: "Asia/Tokyo" },
  { id: 2147714, name: "Sydney", latitude: -33.8688, longitude: 151.2093, country: "Australia", country_code: "AU", timezone: "Australia/Sydney" },
  { id: 2988507, name: "Paris", latitude: 48.8566, longitude: 2.3522, country: "France", country_code: "FR", timezone: "Europe/Paris" },
  { id: 3451190, name: "Rio de Janeiro", latitude: -22.9068, longitude: -43.1729, country: "Brazil", country_code: "BR", timezone: "America/Sao_Paulo" }
];

export default function App() {
  // Application State
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<City[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City>(QUICK_CITIES[0]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0); // 0 = Today, 1 = tomorrow, etc.
  const [isImperial, setIsImperial] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Local Clock of Selected City State
  const [localTimeStr, setLocalTimeStr] = useState<string>('');

  // AI Chat Assistant State
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'assistant', text: string }>>([
    {
      sender: 'assistant',
      text: "Hello! I am your Aether AI Weather intelligence consultant. Ask me anything about planning your activities, outfits, or trips based on the current forecast!"
    }
  ]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close search suggestions on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch weather data when selected city changes
  useEffect(() => {
    fetchWeatherData(selectedCity);
    setSelectedDayIndex(0); // Reset to today
  }, [selectedCity]);

  // Update localized city clock
  useEffect(() => {
    if (!weatherData) return;

    const updateClock = () => {
      try {
        const options: Intl.DateTimeFormatOptions = {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: weatherData.timezone,
          hour12: false
        };
        const formatter = new Intl.DateTimeFormat('en-US', options);
        setLocalTimeStr(formatter.format(new Date()));
      } catch (err) {
        // Fallback to standard local time if timezone is invalid/unsupported
        setLocalTimeStr(new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }));
      }
    };

    updateClock();
    const interval = setInterval(updateClock, 30000); // update every 30s
    return () => clearInterval(interval);
  }, [weatherData]);

  // Handle Autocomplete Search typing
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    if (val.trim().length < 2) {
      setSuggestions([]);
      setIsSuggestionsLoading(false);
      return;
    }

    setIsSuggestionsLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=6&language=en&format=json`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          const cities: City[] = data.results.map((item: any) => ({
            id: item.id,
            name: item.name,
            latitude: item.latitude,
            longitude: item.longitude,
            country: item.country,
            country_code: item.country_code,
            admin1: item.admin1,
            timezone: item.timezone || 'UTC'
          }));
          setSuggestions(cities);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Geocoding search failed:", err);
      } finally {
        setIsSuggestionsLoading(false);
      }
    }, 450);
  };

  // Trigger search on explicit submission
  const triggerManualSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=1&language=en&format=json`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const city: City = {
          id: item.id,
          name: item.name,
          latitude: item.latitude,
          longitude: item.longitude,
          country: item.country,
          country_code: item.country_code,
          admin1: item.admin1,
          timezone: item.timezone || 'UTC'
        };
        setSelectedCity(city);
        setSearchQuery('');
        setShowSuggestions(false);
      } else {
        setError(`City "${searchQuery}" not found. Try searching for a major city.`);
      }
    } catch (err) {
      setError("Network error fetching location.");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Forecast from Open-Meteo
  const fetchWeatherData = async (city: City) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum,wind_speed_10m_max&timezone=${encodeURIComponent(city.timezone)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather service returned an error.");
      const data = await res.json();
      setWeatherData(data);
      
      // Auto reset chat prompt welcome text on city change
      setChatMessages([
        {
          sender: 'assistant',
          text: `I've loaded the real-time meteorological conditions for ${city.name}, ${city.country}. Ask me about planning tips, gear recommendations, or how the conditions will feel!`
        }
      ]);
    } catch (err) {
      setError("Could not retrieve forecast data. Please verify your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Unit Converter Helpers
  const formatTemp = (celsius: number) => {
    if (isImperial) {
      return `${Math.round(celsius * 9 / 5 + 32)}°F`;
    }
    return `${Math.round(celsius)}°C`;
  };

  const formatWind = (kmh: number) => {
    if (isImperial) {
      return `${Math.round(kmh * 0.621371)} mph`;
    }
    return `${Math.round(kmh)} km/h`;
  };

  const formatPrecip = (mm: number) => {
    if (isImperial) {
      return `${(mm * 0.0393701).toFixed(2)} in`;
    }
    return `${mm.toFixed(1)} mm`;
  };

  // WMO Weather Code Translation
  const getWeatherInfo = (code: number) => {
    switch (code) {
      case 0:
        return { label: "Sunny", icon: Sun, color: "text-amber-400", bgGlow: "rgba(245, 158, 11, 0.25)" };
      case 1:
        return { label: "Mainly Clear", icon: Sun, color: "text-amber-200", bgGlow: "rgba(252, 211, 77, 0.15)" };
      case 2:
        return { label: "Partly Cloudy", icon: Cloud, color: "text-blue-200", bgGlow: "rgba(147, 197, 253, 0.15)" };
      case 3:
        return { label: "Overcast", icon: Cloud, color: "text-slate-300", bgGlow: "rgba(148, 163, 184, 0.15)" };
      case 45:
      case 48:
        return { label: "Foggy", icon: CloudFog, color: "text-slate-300", bgGlow: "rgba(203, 213, 225, 0.15)" };
      case 51:
      case 53:
      case 55:
        return { label: "Drizzle", icon: CloudDrizzle, color: "text-sky-300", bgGlow: "rgba(125, 211, 252, 0.2)" };
      case 56:
      case 57:
        return { label: "Freezing Drizzle", icon: CloudSnow, color: "text-blue-100", bgGlow: "rgba(191, 219, 254, 0.2)" };
      case 61:
      case 63:
      case 65:
        return { label: "Rainy", icon: CloudRain, color: "text-blue-400", bgGlow: "rgba(96, 165, 250, 0.25)" };
      case 66:
      case 67:
        return { label: "Freezing Rain", icon: CloudSnow, color: "text-cyan-300", bgGlow: "rgba(103, 232, 249, 0.2)" };
      case 71:
      case 73:
      case 75:
        return { label: "Snowy", icon: CloudSnow, color: "text-white", bgGlow: "rgba(255, 255, 255, 0.2)" };
      case 77:
        return { label: "Snow Grains", icon: CloudSnow, color: "text-slate-100", bgGlow: "rgba(241, 245, 249, 0.15)" };
      case 80:
      case 81:
      case 82:
        return { label: "Rain Showers", icon: CloudRain, color: "text-blue-300", bgGlow: "rgba(147, 197, 253, 0.2)" };
      case 85:
      case 86:
        return { label: "Snow Showers", icon: CloudSnow, color: "text-teal-100", bgGlow: "rgba(204, 251, 241, 0.15)" };
      case 95:
      case 96:
      case 99:
        return { label: "Thunderstorm", icon: CloudLightning, color: "text-yellow-400", bgGlow: "rgba(234, 179, 8, 0.3)" };
      default:
        return { label: "Cloudy", icon: Cloud, color: "text-slate-300", bgGlow: "rgba(203, 213, 225, 0.1)" };
    }
  };

  // Retrieve current day weather metrics or forecasted daily details based on selected day index
  const getActiveDayMetrics = () => {
    if (!weatherData) return null;
    
    const isToday = selectedDayIndex === 0;
    
    // For today, we can display highly granular parameters
    const code = weatherData.daily.weather_code[selectedDayIndex];
    const tempMax = weatherData.daily.temperature_2m_max[selectedDayIndex];
    const tempMin = weatherData.daily.temperature_2m_min[selectedDayIndex];
    const uv = weatherData.daily.uv_index_max[selectedDayIndex];
    const precip = weatherData.daily.precipitation_sum[selectedDayIndex];
    const wind = weatherData.daily.wind_speed_10m_max[selectedDayIndex];
    
    let currentTemp = isToday ? weatherData.current.temperature_2m : (tempMax + tempMin) / 2;
    let humidity = isToday ? weatherData.current.relative_humidity_2m : 55; // default estimation for future
    let feelsLike = isToday ? weatherData.current.apparent_temperature : currentTemp;

    return {
      code,
      tempMax,
      tempMin,
      currentTemp,
      uv,
      precip,
      wind,
      humidity,
      feelsLike,
      isToday
    };
  };

  const activeMetrics = getActiveDayMetrics();

  // Dynamic Intelligence Recommendation Generators
  const getRecommendations = () => {
    if (!activeMetrics) return null;

    const { code, tempMax, tempMin, wind, uv, precip, currentTemp } = activeMetrics;
    const isRainy = code >= 51 && code <= 67 || code >= 80 && code <= 82 || code >= 95;
    const isSnowy = code >= 71 && code <= 77 || code >= 85 && code <= 86;

    // 1. Outdoor Planning
    let outdoor = {
      title: "Outdoor Activities & Fitness",
      status: "Excellent conditions",
      desc: "Perfect day for hiking, running, or a park workout. Low wind resistance and pleasant skies.",
      color: "from-emerald-500/10 to-teal-500/10 text-emerald-300",
      iconColor: "text-emerald-400",
      bgBorder: "border-emerald-500/20"
    };

    if (isRainy) {
      outdoor = {
        title: "Outdoor Activities & Fitness",
        status: "Rain alert — Indoor preferred",
        desc: "High precipitation chances. Postpone hikes or outdoor runs. Great day for treadmill training or indoor gym sessions.",
        color: "from-blue-500/10 to-cyan-500/10 text-blue-300",
        iconColor: "text-blue-400",
        bgBorder: "border-blue-500/20"
      };
    } else if (isSnowy) {
      outdoor = {
        title: "Outdoor Activities & Fitness",
        status: "Snow cover warning",
        desc: "Slippery tracks underfoot. Opt for snow boots or indoor recreational workouts today.",
        color: "from-sky-500/10 to-slate-500/10 text-sky-200",
        iconColor: "text-sky-300",
        bgBorder: "border-sky-500/20"
      };
    } else if (wind > 28) {
      outdoor = {
        title: "Outdoor Activities & Fitness",
        status: "Very windy conditions",
        desc: "Substantial wind resistance. Cyclists will face difficult head-winds. Jogging might feel challenging.",
        color: "from-slate-500/10 to-indigo-500/10 text-indigo-300",
        iconColor: "text-indigo-400",
        bgBorder: "border-indigo-500/20"
      };
    } else if (tempMax > 33) {
      outdoor = {
        title: "Outdoor Activities & Fitness",
        status: "High Heat Advisory",
        desc: "Limit direct outdoor sun exposure. Exercise early in the morning or stick to air-conditioned spaces.",
        color: "from-rose-500/10 to-orange-500/10 text-rose-300",
        iconColor: "text-rose-400",
        bgBorder: "border-rose-500/20"
      };
    } else if (tempMin < 3) {
      outdoor = {
        title: "Outdoor Activities & Fitness",
        status: "Near-Freezing Temperatures",
        desc: "Cold chill. Wear thick insulated layers. Perfect for brisk walks, but warm up well to protect muscles.",
        color: "from-amber-500/10 to-orange-500/10 text-amber-300",
        iconColor: "text-amber-400",
        bgBorder: "border-amber-500/20"
      };
    }

    // 2. UV and Skin Exposure
    let uvRec = {
      title: "UV Exposure & Sun Safety",
      status: "Safe exposure indices",
      desc: "Low UV risk today. No extensive sunscreen is needed unless in high altitude or snow fields.",
      color: "from-green-500/10 to-emerald-500/10 text-emerald-200",
      iconColor: "text-emerald-400",
      bgBorder: "border-emerald-500/15"
    };

    if (uv >= 6) {
      uvRec = {
        title: "UV Exposure & Sun Safety",
        status: `High UV index (${uv})`,
        desc: "Sunscreen SPF 30+, sunglasses, and protective hats are highly recommended. Seek shade between 11:00 AM and 3:00 PM.",
        color: "from-rose-500/10 to-red-500/10 text-rose-300",
        iconColor: "text-rose-400",
        bgBorder: "border-rose-500/20"
      };
    } else if (uv >= 3) {
      uvRec = {
        title: "UV Exposure & Sun Safety",
        status: `Moderate UV index (${uv})`,
        desc: "SPF 15+ is ideal if outdoors for more than 45 minutes. Standard sunglasses and eye care recommended.",
        color: "from-orange-500/10 to-amber-500/10 text-orange-300",
        iconColor: "text-orange-400",
        bgBorder: "border-orange-500/20"
      };
    }

    // 3. Gear & Commute Recommendations
    let gear = {
      title: "Commute & Gear Strategy",
      status: "Clear roads & fair commute",
      desc: "Dry roads, high visibility. Excellent conditions for cycling, riding public transit, or driving.",
      color: "from-violet-500/10 to-purple-500/10 text-violet-300",
      iconColor: "text-violet-400",
      bgBorder: "border-violet-500/15"
    };

    if (isRainy) {
      gear = {
        title: "Commute & Gear Strategy",
        status: "Wet roads — Rain gear needed",
        desc: `Expect water pooling and reduced braking distance. Grab a sturdy umbrella and water-repellent jacket.`,
        color: "from-blue-500/10 to-indigo-500/10 text-blue-300",
        iconColor: "text-blue-400",
        bgBorder: "border-blue-500/20"
      };
    } else if (isSnowy) {
      gear = {
        title: "Commute & Gear Strategy",
        status: "Slippery roads — Winter dress",
        desc: "Carry snow scrapers, wear high-traction waterproof boots, and drive at reduced speeds to prevent skidding.",
        color: "from-slate-500/10 to-zinc-500/10 text-slate-200",
        iconColor: "text-slate-300",
        bgBorder: "border-slate-500/20"
      };
    } else if (currentTemp < 8) {
      gear = {
        title: "Commute & Gear Strategy",
        status: "Cold commute — Dress in layers",
        desc: "A heavy coat, wool socks, and scarf are ideal to block wind chills. Let your car engine warm up briefly.",
        color: "from-indigo-500/10 to-blue-500/10 text-indigo-200",
        iconColor: "text-indigo-300",
        bgBorder: "border-indigo-500/20"
      };
    }

    return { outdoor, uvRec, gear };
  };

  const recs = getRecommendations();

  // AI Assistant Weather Consultation Logic
  const handleChatSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !weatherData || !activeMetrics) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    // Generate weather-aware consultation reply instantly
    setTimeout(() => {
      const weatherState = getWeatherInfo(activeMetrics.code).label;
      const tMaxStr = formatTemp(activeMetrics.tempMax);
      const tMinStr = formatTemp(activeMetrics.tempMin);
      const windStr = formatWind(activeMetrics.wind);
      const precipStr = formatPrecip(activeMetrics.precip);
      const queryLower = userMsg.toLowerCase();

      let reply = "";

      if (queryLower.includes('wear') || queryLower.includes('outfit') || queryLower.includes('clothing') || queryLower.includes('jacket') || queryLower.includes('clothes')) {
        if (activeMetrics.tempMax < 5) {
          reply = `For freezing temps in ${selectedCity.name} (${tMinStr} to ${tMaxStr}), I highly recommend thermal underlayers, a thick windproof down coat, gloves, a warm scarf, and insulated winter boots. Pack handwarmers if you plan to stay out long!`;
        } else if (activeMetrics.tempMax < 14) {
          reply = `It's quite cool in ${selectedCity.name}. Go with a medium-weight sweater under a light trenchcoat or windbreaker, paired with jeans. A beanie or scarf would be comfortable in the shade.`;
        } else if (activeMetrics.tempMax < 22) {
          reply = `Pleasant and mild conditions! A simple long-sleeve tee, hoodie, or cardigans that you can easily take off is perfect. Comfortable jeans or chinos will suit the day well.`;
        } else {
          reply = `It's warm in ${selectedCity.name} (high of ${tMaxStr}). Light fabrics like cotton or linen, shorts, t-shirts, and breathable sneakers are optimal. Don't forget your sunglasses!`;
        }

        if (activeMetrics.precip > 0.5) {
          reply += ` Also, keep an umbrella or raincoat close as there's a registered rainfall of ${precipStr} forecasted!`;
        }
      } else if (queryLower.includes('run') || queryLower.includes('exercise') || queryLower.includes('outdoor') || queryLower.includes('hiking') || queryLower.includes('bike') || queryLower.includes('barbecue') || queryLower.includes('picnic')) {
        if (activeMetrics.precip > 2) {
          reply = `I would advise against long outdoor activities today in ${selectedCity.name}. With ${precipStr} of rain, tracks will be slippery and visibility low. An indoor fitness center or stretching routine is much safer.`;
        } else if (activeMetrics.wind > 25) {
          reply = `Running or cycling will be quite difficult due to strong wind speeds of ${windStr}. If you do go out, plan your route so you run against the wind first and have a tailwind on your return!`;
        } else if (activeMetrics.tempMax > 32) {
          reply = `High heat alert! Outdoor runs or hikes should be kept short, or done before 8:00 AM or after 7:00 PM. Drink plenty of water and wear sunscreen to avoid heat stroke.`;
        } else {
          reply = `Excellent choice! The weather in ${selectedCity.name} is looking wonderful for outdoor planning. Winds are calm at ${windStr} and max temperature is a comfortable ${tMaxStr}. A great window for hiking, jogging, or a family park picnic!`;
        }
      } else if (queryLower.includes('umbrella') || queryLower.includes('rain') || queryLower.includes('precipitation')) {
        if (activeMetrics.precip > 0.2) {
          reply = `Yes, definitely hold onto your umbrella! We are projecting around ${precipStr} of total precipitation today in ${selectedCity.name} under ${weatherState.toLowerCase()} conditions.`;
        } else {
          reply = `No umbrella needed today! Total precipitation is close to 0mm with dry ${weatherState.toLowerCase()} conditions expected throughout the day.`;
        }
      } else if (queryLower.includes('uv') || queryLower.includes('sun') || queryLower.includes('sunscreen')) {
        if (activeMetrics.uv >= 6) {
          reply = `UV index is high at ${activeMetrics.uv}. Make sure to apply a generous amount of SPF 30+ sunscreen, wear a wide hat, and protect your eyes with polarized sunglasses. Seek shadows around midday!`;
        } else if (activeMetrics.uv >= 3) {
          reply = `UV index is moderate at ${activeMetrics.uv}. You should apply a basic sunscreen if you're exposed directly to the sun for more than 40 minutes, but risks are fairly manageable.`;
        } else {
          reply = `Sun protection needs are very low today (UV Index is ${activeMetrics.uv}). You can safely enjoy the outdoors without major sunblock concerns.`;
        }
      } else {
        reply = `The weather in ${selectedCity.name} is currently ${weatherState.toLowerCase()} with temperatures scaling between ${tMinStr} and ${tMaxStr}. Relative humidity is around ${activeMetrics.humidity}% with a breeze of ${windStr}. This makes for a stable environment. Is there a specific activity or outdoor schedule you wanted me to evaluate?`;
      }

      setChatMessages(prev => [...prev, { sender: 'assistant', text: reply }]);
    }, 600);
  };

  // Helper for formatting date strings
  const formatDateLabel = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
  };

  const getDayOfWeekName = (isoStr: string) => {
    const date = new Date(isoStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  return (
    <div className="relative min-h-screen text-white font-sans selection:bg-blue-500/40 select-none pb-12">
      {/* Immersive mesh background as configured in index.css */}
      <div className="mesh-bg"></div>

      {/* Main app container with maximum bounds */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* HEADER BRAND & SEARCH */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-blue-300 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 19a3.5 3.5 0 0 0 0-7h-1.5a7 7 0 1 0-11.91 4.42"></path>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 id="app-title" className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
                  AetherWeather
                </h1>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-400/30 uppercase tracking-widest">
                  Intelligence v2.4
                </span>
              </div>
              <p className="text-xs text-white/50">Next-Gen Meteorological Decision Platform</p>
            </div>
          </div>

          {/* Autocomplete Search input bar */}
          <div className="relative flex-1 max-w-md" ref={dropdownRef}>
            <div className="glass rounded-full px-4 py-2.5 flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-400/50 transition-all duration-300 shadow-lg">
              <Search className="w-4 h-4 text-white/40 shrink-0" />
              <input
                id="city-search-input"
                type="text"
                placeholder="Search city (e.g. Paris, New York)..."
                className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/30"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') triggerManualSearch();
                }}
              />
              {isSuggestionsLoading && (
                <RefreshCw className="w-4 h-4 text-white/40 animate-spin shrink-0" />
              )}
              {searchQuery && (
                <button
                  id="search-clear-btn"
                  onClick={() => {
                    setSearchQuery('');
                    setSuggestions([]);
                  }}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white/50" />
                </button>
              )}
            </div>

            {/* Suggestions drop-down menu with beautiful glass overlay */}
            {showSuggestions && suggestions.length > 0 && (
              <div id="autocomplete-dropdown" className="absolute top-full left-0 right-0 mt-2 glass rounded-2xl overflow-hidden z-50 shadow-2xl divide-y divide-white/5 animate-in fade-in slide-in-from-top-2 duration-200">
                {suggestions.map((city) => (
                  <button
                    key={`${city.id}-${city.name}`}
                    onClick={() => {
                      setSelectedCity(city);
                      setSearchQuery('');
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-5 py-3 hover:bg-white/10 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-semibold text-white group-hover:text-blue-300 transition-colors text-sm">
                        {city.name}
                      </span>
                      {city.admin1 && (
                        <span className="text-xs text-white/40 ml-2">
                          ({city.admin1})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/50">{city.country}</span>
                      {city.country_code && (
                        <span className="text-[10px] bg-white/10 text-white/70 px-1.5 py-0.5 rounded font-mono uppercase">
                          {city.country_code}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick toggle systems & Refresh */}
          <div className="flex items-center gap-3">
            {/* Unit toggle Switch */}
            <div className="glass rounded-full p-1 flex items-center shadow-md">
              <button
                id="unit-celsius-btn"
                onClick={() => setIsImperial(false)}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                  !isImperial ? 'bg-blue-500 text-white shadow' : 'text-white/60 hover:text-white'
                }`}
              >
                °C
              </button>
              <button
                id="unit-fahrenheit-btn"
                onClick={() => setIsImperial(true)}
                className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
                  isImperial ? 'bg-blue-500 text-white shadow' : 'text-white/60 hover:text-white'
                }`}
              >
                °F
              </button>
            </div>

            {/* Manual refresh button */}
            <button
              id="refresh-weather-btn"
              onClick={() => fetchWeatherData(selectedCity)}
              className="glass p-2.5 rounded-full hover:bg-white/15 transition-all shadow-md group"
              title="Refresh Forecast"
            >
              <RefreshCw className={`w-4 h-4 text-white/80 group-hover:rotate-180 transition-all duration-500 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </header>

        {/* ERROR DISPATCHER */}
        {error && (
          <div id="error-banner" className="glass rounded-2xl p-4 mb-6 border border-rose-500/30 flex items-center gap-3 text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="flex-1 text-sm">{error}</div>
            <button
              id="dismiss-error-btn"
              onClick={() => setError(null)}
              className="p-1 hover:bg-rose-500/20 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* QUICK SELECT CHIPS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-4 scrollbar-none">
          <span className="text-xs text-white/40 font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1 mr-2">
            <MapPin className="w-3 h-3" /> Quick Cities:
          </span>
          {QUICK_CITIES.map((city) => (
            <button
              key={city.id}
              id={`quick-city-${city.name.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setSelectedCity(city)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                selectedCity.id === city.id
                  ? 'bg-blue-500/20 border border-blue-400/50 text-blue-300 font-bold shadow-md'
                  : 'glass text-white/70 hover:bg-white/10 hover:text-white border border-transparent'
              }`}
            >
              {city.name}
            </button>
          ))}
        </div>

        {/* LOADING SHIMMER STATE */}
        {isLoading && !weatherData && (
          <div className="h-96 glass rounded-3xl flex flex-col items-center justify-center gap-4 animate-pulse">
            <RefreshCw className="w-10 h-10 text-blue-400 animate-spin" />
            <p className="text-white/60 font-medium">Gathering high-resolution atmospheric metrics...</p>
          </div>
        )}

        {/* WEATHER DASHBOARD CONTENT CONTAINER */}
        {weatherData && activeMetrics && (
          <main className="grid grid-cols-12 gap-6 items-stretch mb-6">
            
            {/* LEFT COLUMN - CURRENT WEATHER CONDITIONS */}
            <section className="col-span-12 lg:col-span-5 flex flex-col justify-between glass rounded-3xl p-6 relative overflow-hidden shadow-2xl border border-white/10">
              
              {/* Dynamic backlighting visual cue */}
              <div
                className="absolute inset-0 z-0 opacity-40 blur-3xl"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${getWeatherInfo(activeMetrics.code).bgGlow}, transparent 70%)`
                }}
              />

              <div className="relative z-10">
                {/* Condition top badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-xs font-semibold uppercase tracking-widest text-emerald-300">
                      {selectedDayIndex === 0 ? "LIVE CONDITIONS" : "FORECAST VIEW"}
                    </span>
                  </div>
                  {/* Forecast Offset Indicator */}
                  {selectedDayIndex > 0 && (
                    <button
                      id="reset-day-btn"
                      onClick={() => setSelectedDayIndex(0)}
                      className="text-xs bg-white/10 text-white/80 hover:bg-white/20 transition-all px-2.5 py-1 rounded-full border border-white/10 flex items-center gap-1.5"
                    >
                      <Calendar className="w-3 h-3" />
                      Back to Today
                    </button>
                  )}
                </div>

                {/* Location Heading & Date */}
                <div className="mb-6">
                  <h2 id="current-city-heading" className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm">
                    {selectedCity.name}
                  </h2>
                  <p id="current-country-lbl" className="text-sm font-semibold text-blue-200/50 uppercase tracking-widest mt-1">
                    {selectedCity.country}
                  </p>
                  <p id="local-time-lbl" className="text-sm text-white/60 font-medium mt-2">
                    {selectedDayIndex === 0 ? localTimeStr : `${formatDateLabel(weatherData.daily.time[selectedDayIndex])} Forecast`}
                  </p>
                </div>

                {/* Temperature + Core Icon Block */}
                <div className="flex items-center justify-between gap-4 mt-8 mb-8">
                  <div>
                    <div id="temperature-display" className="text-7xl sm:text-8xl font-extrabold tracking-tighter text-white select-none">
                      {formatTemp(activeMetrics.currentTemp)}
                    </div>
                    {/* Apparent Temp */}
                    {selectedDayIndex === 0 && (
                      <p id="feels-like-lbl" className="text-xs sm:text-sm text-white/60 font-medium mt-1">
                        Feels like <span className="font-bold text-white/90">{formatTemp(activeMetrics.feelsLike)}</span>
                      </p>
                    )}
                    {selectedDayIndex > 0 && (
                      <p id="feels-like-lbl" className="text-xs sm:text-sm text-white/60 font-medium mt-1">
                        Range: <span className="font-bold text-white/90">{formatTemp(activeMetrics.tempMin)} - {formatTemp(activeMetrics.tempMax)}</span>
                      </p>
                    )}
                  </div>

                  {/* Sky Condition Visual Card */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div id="sky-icon-container" className="weather-icon-glow mb-2">
                      {(() => {
                        const IconComponent = getWeatherInfo(activeMetrics.code).icon;
                        const iconColor = getWeatherInfo(activeMetrics.code).color;
                        return <IconComponent className={`w-16 h-16 ${iconColor}`} strokeWidth={1.5} />;
                      })()}
                    </div>
                    <span id="sky-description-lbl" className="text-lg font-bold text-white/90 tracking-wide text-center">
                      {getWeatherInfo(activeMetrics.code).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-Atmospheric Metric Grids */}
              <div id="sub-metrics-grid" className="grid grid-cols-2 gap-3 relative z-10 mt-auto pt-6 border-t border-white/5">
                
                {/* Windspeed */}
                <div className="glass/20 p-3 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-400/20 flex items-center justify-center text-blue-300">
                    <Wind className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] block uppercase font-semibold text-white/40">Wind Vector</span>
                    <span id="wind-speed-lbl" className="text-sm font-bold text-white/95">
                      {selectedDayIndex === 0 ? formatWind(weatherData.current.wind_speed_10m) : formatWind(activeMetrics.wind)}
                    </span>
                  </div>
                </div>

                {/* Relative Humidity */}
                <div className="glass/20 p-3 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-400/20 flex items-center justify-center text-cyan-300">
                    <Droplets className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] block uppercase font-semibold text-white/40">Humidity</span>
                    <span id="humidity-percentage-lbl" className="text-sm font-bold text-white/95">
                      {activeMetrics.humidity}%
                    </span>
                  </div>
                </div>

                {/* UV Max Index */}
                <div className="glass/20 p-3 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center text-amber-300">
                    <Sun className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] block uppercase font-semibold text-white/40">UV Intensity</span>
                    <span id="uv-max-lbl" className="text-sm font-bold text-white/95">
                      {activeMetrics.uv.toFixed(1)} Index
                    </span>
                  </div>
                </div>

                {/* Total Precipitation Sum */}
                <div className="glass/20 p-3 rounded-2xl flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center text-indigo-300">
                    <Umbrella className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] block uppercase font-semibold text-white/40">Precip Total</span>
                    <span id="precip-sum-lbl" className="text-sm font-bold text-white/95">
                      {formatPrecip(activeMetrics.precip)}
                    </span>
                  </div>
                </div>

              </div>

            </section>

            {/* RIGHT COLUMN - THREE RECOMMENDATION CARDS + Conversational Weather AI */}
            <section className="col-span-12 lg:col-span-7 flex flex-col gap-4">
              
              {/* Card 1: Outdoor Activities */}
              {recs && (
                <div id="outdoor-planning-card" className={`glass rounded-2xl p-5 border ${recs.outdoor.bgBorder} bg-gradient-to-br ${recs.outdoor.color} transition-all duration-300 relative group overflow-hidden`}>
                  <div className="flex gap-4 items-start">
                    <div className={`w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center shrink-0 ${recs.outdoor.iconColor}`}>
                      <Compass className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <h4 className="font-bold text-base text-white tracking-wide">{recs.outdoor.title}</h4>
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-emerald-300 shrink-0 self-start">
                          {recs.outdoor.status}
                        </span>
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed font-normal">{recs.outdoor.desc}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 2: UV Index Skin Protection */}
              {recs && (
                <div id="uv-protection-card" className={`glass rounded-2xl p-5 border ${recs.uvRec.bgBorder} bg-gradient-to-br ${recs.uvRec.color} transition-all duration-300 relative group overflow-hidden`}>
                  <div className="flex gap-4 items-start">
                    <div className={`w-10 h-10 rounded-full bg-amber-500/10 border border-amber-400/20 flex items-center justify-center shrink-0 ${recs.uvRec.iconColor}`}>
                      <Flame className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <h4 className="font-bold text-base text-white tracking-wide">{recs.uvRec.title}</h4>
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-amber-300 shrink-0 self-start">
                          {recs.uvRec.status}
                        </span>
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed font-normal">{recs.uvRec.desc}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Card 3: Commuter Strategy */}
              {recs && (
                <div id="commute-gear-card" className={`glass rounded-2xl p-5 border ${recs.gear.bgBorder} bg-gradient-to-br ${recs.gear.color} transition-all duration-300 relative group overflow-hidden`}>
                  <div className="flex gap-4 items-start">
                    <div className={`w-10 h-10 rounded-full bg-violet-500/10 border border-violet-400/20 flex items-center justify-center shrink-0 ${recs.gear.iconColor}`}>
                      <Car className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                        <h4 className="font-bold text-base text-white tracking-wide">{recs.gear.title}</h4>
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-violet-300 shrink-0 self-start">
                          {recs.gear.status}
                        </span>
                      </div>
                      <p className="text-sm text-white/70 leading-relaxed font-normal">{recs.gear.desc}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* INTERACTIVE WEATHER AI CONSULTANT BOX */}
              <div id="ai-consultant-box" className="glass rounded-3xl p-5 border border-white/15 bg-slate-900/40 flex-1 flex flex-col justify-between shadow-xl min-h-[240px]">
                <div>
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4.5 h-4.5 text-blue-400 animate-pulse" />
                      <h4 className="font-bold text-sm tracking-wide text-blue-200">Consultant Aether AI</h4>
                    </div>
                    <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-400/20 px-2 py-0.5 rounded-full font-mono">
                      Meteorology Model v1
                    </span>
                  </div>

                  {/* Chat dialog viewport */}
                  <div id="chat-dialog-viewport" className="space-y-3 max-h-[160px] overflow-y-auto pr-1 text-xs">
                    {chatMessages.map((msg, index) => (
                      <div
                        key={index}
                        className={`p-2.5 rounded-2xl max-w-[85%] leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white ml-auto rounded-tr-none'
                            : 'bg-white/5 text-white/90 rounded-tl-none border border-white/5'
                        }`}
                      >
                        {msg.text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pre-baked questions & interactive prompt input form */}
                <div className="mt-4 pt-3 border-t border-white/5">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <button
                      id="prompt-btn-wear"
                      onClick={() => {
                        setChatInput("What should I wear today?");
                      }}
                      className="text-[10px] bg-white/5 hover:bg-white/15 text-white/70 hover:text-white px-2.5 py-1 rounded-full transition-all border border-white/5"
                    >
                      👔 What to wear?
                    </button>
                    <button
                      id="prompt-btn-exercise"
                      onClick={() => {
                        setChatInput("Is it a good day for a run?");
                      }}
                      className="text-[10px] bg-white/5 hover:bg-white/15 text-white/70 hover:text-white px-2.5 py-1 rounded-full transition-all border border-white/5"
                    >
                      🏃 Good for jogging?
                    </button>
                    <button
                      id="prompt-btn-sun"
                      onClick={() => {
                        setChatInput("Do I need sunscreen today?");
                      }}
                      className="text-[10px] bg-white/5 hover:bg-white/15 text-white/70 hover:text-white px-2.5 py-1 rounded-full transition-all border border-white/5"
                    >
                      ☀️ Need sun protection?
                    </button>
                  </div>

                  <form onSubmit={handleChatSubmit} className="flex gap-2">
                    <input
                      id="ai-chat-input"
                      type="text"
                      placeholder="Ask Aether AI about weather-safe schedules..."
                      className="bg-white/5 focus:bg-white/10 outline-none border border-white/10 focus:border-blue-400/40 rounded-full px-4 py-2 text-xs w-full text-white placeholder:text-white/35 transition-all"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button
                      id="send-chat-btn"
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-full transition-all shadow-md shrink-0 active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>

              </div>

            </section>

          </main>
        )}

        {/* FOOTER 7-DAY FORECAST SECTION */}
        {weatherData && (
          <footer className="mt-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-white/40" />
              <h3 className="font-bold text-sm text-white/80 uppercase tracking-widest">
                High-Resolution 7-Day Forecast Plan
              </h3>
            </div>

            <div id="forecast-cards-container" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {weatherData.daily.time.map((timeStr, idx) => {
                const code = weatherData.daily.weather_code[idx];
                const max = weatherData.daily.temperature_2m_max[idx];
                const min = weatherData.daily.temperature_2m_min[idx];
                const weather = getWeatherInfo(code);
                const WeatherIcon = weather.icon;
                const isSelected = selectedDayIndex === idx;

                return (
                  <button
                    key={timeStr}
                    id={`forecast-day-btn-${idx}`}
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`glass-hover glass rounded-2xl p-4 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer border transition-all relative ${
                      isSelected
                        ? 'bg-white/15 border-white/50 ring-2 ring-white/10 scale-102 z-10 shadow-xl'
                        : 'border-white/5 hover:border-white/10 bg-white/5'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute -top-1.5 right-2">
                        <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full font-bold shadow uppercase tracking-wide">
                          Selected
                        </span>
                      </div>
                    )}
                    <span className="text-xs font-bold text-white/50 uppercase tracking-wider block">
                      {idx === 0 ? "Today" : getDayOfWeekName(timeStr)}
                    </span>
                    <span className="text-[10px] text-white/30 block -mt-1 font-mono">
                      {formatDateLabel(timeStr).split(' ')[1]}
                    </span>
                    
                    <div className="weather-icon-glow w-10 h-10 flex items-center justify-center">
                      <WeatherIcon className={`w-7 h-7 ${weather.color}`} strokeWidth={1.8} />
                    </div>

                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-sm font-extrabold text-white">
                        {formatTemp(max).replace('°C', '°').replace('°F', '°')}
                      </span>
                      <span className="text-xs text-white/40">
                        {formatTemp(min).replace('°C', '°').replace('°F', '°')}
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold text-white/60 tracking-tight leading-none h-3 truncate max-w-[90px]">
                      {weather.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </footer>
        )}

      </div>
    </div>
  );
}
