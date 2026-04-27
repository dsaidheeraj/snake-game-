import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, RefreshCw, Volume2, VolumeX, Trophy, Music } from 'lucide-react';

const TRACKS = [
  {
    id: 1,
    title: "Neon Synthesis (AI Generated)",
    artist: "Cyber Flow",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    color: "from-cyan-500 to-blue-600",
    shadow: "shadow-cyan-500/50"
  },
  {
    id: 2,
    title: "Digital Horizon (AI Generated)",
    artist: "Synth Circuit",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    color: "from-fuchsia-500 to-pink-600",
    shadow: "shadow-fuchsia-500/50"
  },
  {
    id: 3,
    title: "Midnight Run (AI Generated)",
    artist: "Data Stream",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    color: "from-emerald-500 to-teal-600",
    shadow: "shadow-emerald-500/50"
  }
];

// Snake Game Constants
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 5;
const MIN_SPEED = 50;

type Point = { x: number; y: number };

export default function App() {
  // Audio State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  // Snake State
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Point>({ x: 0, y: -1 });
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  
  const currentTrack = TRACKS[currentTrackIndex];
  
  // Game loop ref
  const gameLoopRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);
  
  // Controls Audio playback
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch((e) => console.log("Audio play blocked by browser. User interaction needed.", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
      audioRef.current.volume = volume;
    }
  }, [isMuted, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
    }
  }, [currentTrackIndex]);

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00";
    const m = Math.floor(time / 60);
    const s = Math.floor(time % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => setIsPlaying(!isPlaying);
  
  const skipForward = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    setIsPlaying(true);
  };
  
  const skipBack = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
    setIsPlaying(true);
  };

  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    let isOccupied = true;
    while (isOccupied) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // eslint-disable-next-line no-loop-func
      isOccupied = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
    }
    return newFood!;
  }, []);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 0, y: -1 });
    setFood(generateFood([{ x: 10, y: 10 }]));
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setIsGameOver(false);
    setGameStarted(true);
  };

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (!gameStarted && !isGameOver && e.key === " ") {
        setGameStarted(true);
        setIsPlaying(true); // Auto-play music on first interaction
        return;
      }
      
      if (isGameOver && e.key === " ") {
        resetGame();
        return;
      }

      setDirection((prev) => {
        switch (e.key) {
          case 'ArrowUp':
          case 'w':
          case 'W':
            return prev.y === 1 ? prev : { x: 0, y: -1 };
          case 'ArrowDown':
          case 's':
          case 'S':
            return prev.y === -1 ? prev : { x: 0, y: 1 };
          case 'ArrowLeft':
          case 'a':
          case 'A':
            return prev.x === 1 ? prev : { x: -1, y: 0 };
          case 'ArrowRight':
          case 'd':
          case 'D':
            return prev.x === -1 ? prev : { x: 1, y: 0 };
          default:
            return prev;
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, isGameOver]);

  // Game Loop
  const updateGame = useCallback((time: number) => {
    if (!gameStarted || isGameOver) return;

    if (time - lastUpdateRef.current < speed) {
      gameLoopRef.current = requestAnimationFrame(updateGame);
      return;
    }

    lastUpdateRef.current = time;

    setSnake((prevSnake) => {
      const head = prevSnake[0];
      const newHead = { x: head.x + direction.x, y: head.y + direction.y };

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        setIsGameOver(true);
        return prevSnake;
      }

      // Self collision
      if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Food collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore((s) => {
          const newScore = s + 10;
          if (newScore > highScore) setHighScore(newScore);
          return newScore;
        });
        setFood(generateFood(newSnake));
        setSpeed((s) => Math.max(MIN_SPEED, s - SPEED_INCREMENT));
        // Keep the tail (snake grows)
      } else {
        newSnake.pop(); // Remove tail
      }

      return newSnake;
    });

    gameLoopRef.current = requestAnimationFrame(updateGame);
  }, [direction, food, gameStarted, isGameOver, speed, highScore, generateFood]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(updateGame);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [updateGame]);

  const speedDisplay = (((INITIAL_SPEED - speed) / SPEED_INCREMENT) * 0.1 + 1.0).toFixed(1);

  return (
    <div className="h-screen w-full bg-[#050505] text-white p-4 sm:p-8 flex flex-col gap-6 overflow-hidden font-sans selection:bg-[#00ff88]/30">
      
      {/* Audio Element */}
      <audio 
        ref={audioRef} 
        src={currentTrack.url} 
        onEnded={skipForward} 
        preload="auto"
      />

      {/* Header Section */}
      <header className="flex justify-between items-center border-b border-[#ffffff15] pb-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00ff88] rounded-lg shadow-[0_0_15px_#00ff8880] flex items-center justify-center">
            <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase italic flex items-center gap-1">
            Synth<span className="text-[#00ff88]">Snake</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Status</p>
            <p className="text-xs text-[#00ff88] font-bold uppercase">
              {gameStarted && !isGameOver ? 'Session Active' : 'Idle'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-800 flex items-center justify-center text-zinc-400 font-mono">
            JS
          </div>
        </div>
      </header>
      
      {/* Main Bento Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-6 gap-6 flex-1 min-h-0 w-full max-w-7xl mx-auto overflow-y-auto lg:overflow-visible pr-2 lg:pr-0 pb-6 lg:pb-0">
        
        {/* Left: Playlist */}
        <section className="col-span-1 lg:col-span-3 lg:row-span-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4 order-2 lg:order-1 relative overflow-y-auto custom-scrollbar">
          <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 flex-shrink-0">Sonic Library</h3>
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            {TRACKS.map((track, i) => {
              const isActive = i === currentTrackIndex;
              return (
                <div 
                  key={track.id} 
                  onClick={() => { setCurrentTrackIndex(i); setIsPlaying(true); }}
                  className={`p-3 rounded cursor-pointer flex items-center gap-3 transition-colors ${
                    isActive 
                      ? 'bg-zinc-800/80 border-l-2 border-[#00ff88]' 
                      : 'bg-transparent border border-zinc-800 hover:bg-zinc-800'
                  }`}
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center text-xs italic shrink-0 font-mono ${
                    isActive ? 'bg-zinc-700 text-[#00ff88]' : 'bg-zinc-900 text-zinc-600'
                  }`}>
                    {(i+1).toString().padStart(2, '0')}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-zinc-300'}`}>{track.title}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{track.artist}</p>
                  </div>
                  {isActive && isPlaying && (
                    <div className="flex gap-[2px] items-end h-3 ml-auto shrink-0">
                      <div className="w-[3px] bg-[#00ff88] rounded-t h-full animate-[bounce_1s_infinite]"></div>
                      <div className="w-[3px] bg-[#00ff88] rounded-t h-[60%] animate-[bounce_0.7s_infinite_0.1s]"></div>
                      <div className="w-[3px] bg-[#00ff88] rounded-t h-[80%] animate-[bounce_1.2s_infinite_0.2s]"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Center: Game */}
        <section className="col-span-1 lg:col-span-6 lg:row-span-4 bg-black border-2 border-zinc-800 rounded-3xl p-2 relative overflow-hidden flex items-center justify-center order-1 lg:order-2 aspect-[4/3] lg:aspect-auto h-full">
          {/* Game Canvas */}
          <div 
            className="bg-[#030303] rounded-2xl relative shadow-inner overflow-hidden border border-[#ffffff05]"
            style={{ 
              width: `${GRID_SIZE * 20}px`, 
              height: `${GRID_SIZE * 20}px`,
              maxWidth: '100%',
              maxHeight: '100%',
              aspectRatio: '1/1'
            }}
          >
            {/* Background Grid Lines */}
            <div className="absolute inset-0 pointer-events-none opacity-5" style={{ 
              backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)',
              backgroundSize: '5% 5%'
            }}></div>

            {/* Snake */}
            {snake.map((segment, index) => {
              const isHead = index === 0;
              return (
                <div
                  key={`${segment.x}-${segment.y}-${index}`}
                  className={`absolute rounded-sm transition-all duration-75 ${
                    isHead 
                      ? "bg-[#00ff88] shadow-[0_0_15px_#00ff88] z-20 scale-110" 
                      : "bg-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.6)] z-10 opacity-90"
                  }`}
                  style={{
                    left: `${(segment.x / GRID_SIZE) * 100}%`,
                    top: `${(segment.y / GRID_SIZE) * 100}%`,
                    width: `${20 * 0.9}px`, // Slight padding
                    height: `${20 * 0.9}px`,
                    margin: `${20 * 0.05}px` 
                  }}
                >
                  {isHead && <div className="absolute top-[2px] left-[2px] w-[3px] h-[3px] bg-black rounded-full" />}
                </div>
              );
            })}

            {/* Food */}
            <div
              className="absolute bg-[#ff0088] rounded-full animate-pulse z-10 shadow-[0_0_15px_#ff0088]"
              style={{
                left: `${(food.x / GRID_SIZE) * 100}%`,
                top: `${(food.y / GRID_SIZE) * 100}%`,
                width: `${20 * 0.9}px`,
                height: `${20 * 0.9}px`,
                margin: `${20 * 0.05}px` 
              }}
            />

            {/* Overlays */}
            {!gameStarted && !isGameOver && (
              <div className="absolute inset-0 bg-[#050505]/70 backdrop-blur-sm flex flex-col items-center justify-center z-30 pointer-events-none">
                <p className="text-[#00ff88] font-bold text-xl uppercase tracking-widest animate-pulse drop-shadow-[0_0_8px_#00ff88]">System Ready</p>
                <p className="text-zinc-400 mt-2 text-[10px] font-mono uppercase tracking-widest">Press Space to Initialize</p>
              </div>
            )}

            {isGameOver && (
              <div className="absolute inset-0 bg-[#ff0088]/10 backdrop-blur-[2px] border border-[#ff0088]/40 flex flex-col items-center justify-center z-30 p-4 text-center">
                <h2 className="text-3xl font-black text-white tracking-tighter drop-shadow-[0_0_10px_#ff0088] mb-1 uppercase">System Failure</h2>
                <p className="text-[#ff0088] font-mono mb-6 text-xs uppercase tracking-widest font-bold">Final Score: {score}</p>
                <button 
                  onClick={resetGame}
                  className="px-5 py-2.5 bg-black/50 border border-[#ff0088] text-white hover:bg-[#ff0088] hover:text-white transition-all shadow-[0_0_15px_#ff008850] rounded outline-none flex items-center gap-2 group"
                >
                  <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500 text-[#ff0088] group-hover:text-white" />
                  <span className="uppercase text-[10px] tracking-widest font-bold">Reboot Protocol</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Right Top: Score (Only md+) */}
        <section className="hidden lg:flex col-span-1 lg:col-span-3 lg:row-span-2 bg-[#ff0088]/5 border border-[#ff008820] rounded-2xl p-5 flex-col justify-between order-3">
          <h3 className="text-xs font-mono text-[#ff0088] uppercase tracking-widest mb-4">Current Session</h3>
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end border-b border-[#ff008830] pb-2">
              <span className="text-xs text-zinc-400 font-mono">SCORE</span>
              <span className="text-4xl font-black text-white leading-none tracking-tighter">{score.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-xs text-zinc-400 font-mono">HIGHSCORE</span>
              <span className="text-lg font-bold text-zinc-300">{highScore.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {/* Right Bottom: Instructions & Stats (Only md+) */}
        <section className="hidden lg:flex col-span-1 lg:col-span-3 lg:row-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex-col justify-between order-4">
          <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Game Logic</h3>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-zinc-800/50 p-2 border border-zinc-700/50 rounded text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Speed</p>
              <p className="text-lg font-bold text-white">{speedDisplay}x</p>
            </div>
            <div className="bg-zinc-800/50 p-2 border border-zinc-700/50 rounded text-center">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Length</p>
              <p className="text-lg font-bold text-white">{snake.length}</p>
            </div>
          </div>
          <div className="flex gap-1 justify-center mt-4">
            <div className="w-7 h-7 border border-zinc-700 rounded flex items-center justify-center text-[10px] font-mono text-zinc-400 shadow-inner bg-zinc-800">W</div>
            <div className="w-7 h-7 border border-zinc-700 rounded flex items-center justify-center text-[10px] font-mono text-zinc-400 shadow-inner bg-zinc-800">A</div>
            <div className="w-7 h-7 border border-zinc-700 rounded flex items-center justify-center text-[10px] font-mono text-zinc-400 shadow-inner bg-zinc-800">S</div>
            <div className="w-7 h-7 border border-zinc-700 rounded flex items-center justify-center text-[10px] font-mono text-zinc-400 shadow-inner bg-zinc-800">D</div>
          </div>
        </section>

        {/* Bottom: Player Controls */}
        <section className="col-span-1 lg:col-span-12 lg:row-span-2 bg-[#00ff88]/5 border border-[#00ff8830] rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 shadow-[0_0_50px_#00ff8808] order-5 shrink-0 relative overflow-hidden">
          
          <div className="flex items-center gap-4 w-full md:w-1/4">
            <div className="w-12 h-12 bg-zinc-800 rounded-lg overflow-hidden shrink-0 shadow-[0_0_15px_rgba(0,255,136,0.3)] border border-[#00ff8830]">
              <div className="w-full h-full bg-gradient-to-br from-[#00ff88] to-[#ff0088] opacity-60 flex items-center justify-center">
                 <Music className="w-5 h-5 text-black drop-shadow-md" />
              </div>
            </div>
            <div className="overflow-hidden min-w-0 pr-4">
              <p className="text-sm font-bold truncate text-white">{currentTrack.title}</p>
              <p className="text-xs text-[#00ff88] truncate uppercase font-mono mt-0.5">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="flex flex-col flex-1 gap-4 w-full md:w-1/2">
            <div className="flex justify-center items-center gap-8">
              <button 
                onClick={skipBack}
                className="text-zinc-500 hover:text-white transition-colors focus:outline-none"
              >
                <SkipBack className="w-5 h-5 fill-current" />
              </button>
              
              <button 
                onClick={togglePlay}
                className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform focus:outline-none shadow-[0_0_20px_#ffffff50]"
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-1 fill-current" />}
              </button>
              
              <button 
                onClick={skipForward}
                className="text-zinc-500 hover:text-white transition-colors focus:outline-none"
              >
                <SkipForward className="w-5 h-5 fill-current" />
              </button>
            </div>
            
            <div className="flex items-center gap-3 w-full max-w-xl mx-auto">
              <span className="text-[10px] font-mono text-zinc-500">{formatTime(currentTime)}</span>
              <div 
                className="flex-1 h-[4px] bg-zinc-800 rounded-full overflow-hidden relative cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  if (audioRef.current && duration) {
                    const newTime = percent * duration;
                    audioRef.current.currentTime = newTime;
                    setCurrentTime(newTime);
                  }
                }}
              >
                <div 
                  className="h-full bg-[#00ff88] relative" 
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[2px] h-full shadow-[0_0_10px_#00ff88] bg-white"></div>
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="w-full md:w-1/4 md:flex justify-end items-center gap-4 hidden">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="text-zinc-500 hover:text-[#00ff88] transition-colors focus:outline-none"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div 
              className="w-24 h-[4px] bg-zinc-800 rounded-full overflow-hidden cursor-pointer flex-shrink-0"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                let v = (e.clientX - rect.left) / rect.width;
                v = Math.max(0, Math.min(1, v));
                setVolume(v);
                setIsMuted(v === 0);
              }}
            >
              <div 
                className="h-full bg-zinc-400 transition-all duration-100" 
                style={{ width: `${isMuted ? 0 : volume * 100}%` }}
              ></div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
