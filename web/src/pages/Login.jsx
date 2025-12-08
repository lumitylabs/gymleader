// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase/config";
import LoginBg from "../assets/login_bg.png";
import GoogleIcon from "../assets/google_icon.svg"; // Adicione um ícone do Google
import LumityFooter from "../assets/login_powered_by_lumity.svg";
import Navbar from "../components/ui/general/Navbar";
import "simplebar-react/dist/simplebar.min.css";
import SimpleBar from "simplebar-react";

const POKEMON_GRID = [
  { id: 700, name: "Sylveon" },
  { id: 658, name: "Greninja" },
  { id: 25, name: "Pikachu" },
  { id: 6, name: "Charizard" },
  { id: 778, name: "Mimikyu" },
  { id: 448, name: "Lucario" },
  { id: 197, name: "Umbreon" },
];


function LoginModal() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState(null);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setLastError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (error) {
      setLastError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className="
absolute z-20 top-60 w-[90%] max-w-sm sm:max-w-md
bg-[#26272B] text-white p-8 flex flex-col items-center rounded-3xl
shadow-neutral-950 shadow-lg select-none mx-auto
md:absolute md:top-[45%] md:-translate-y-1/2 md:left-[5%] md:translate-x-[30%]
md:w-[380px] lg:w-[400px]
"
      >
        <div className="flex flex-col items-center text-center justify-between py-1 space-y-6">
          <div className="space-y-2">
            <div className="font-bold text-[#FAFAFA] text-4xl leading-[1.1]">
              <h1>Create your Gym</h1>
              <h1>Become a Master</h1>
            </div>
            <div className="text-base font-medium text-[#DBDBDC] leading-[1.3] tracking-tight">
              <p>Bring your Pokémon cards to life</p>
              <p>and battle in your gym</p>
            </div>
          </div>
          <PokemonGrid />
          <Separator />
          <div className="w-full flex flex-col items-center gap-4">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="relative w-full h-13 bg-white text-[#131316] font-regular rounded-xl hover:bg-[#E3E3E4] transition-all active:scale-95 duration-200 flex items-center justify-center text-[0.92em] tracking-tight cursor-pointer disabled:opacity-50"
            >
              <img src={GoogleIcon} className="absolute left-4 w-5 h-5" alt="Google Icon" />
              <span>
                {isLoading ? "Connecting..." : "Continue with Google"}
              </span>
            </button>

            {lastError && (
              <div className="text-xs text-red-400 text-center max-w-[18rem] pt-2">
                {lastError}
              </div>
            )}
            <div className="text-xs text-gray-500 text-center max-w-[13rem] pt-2">
              By continuing, you agree with the{" "}
              <a href="#" className="font-medium text-gray-400 hover:text-white transition-colors">
                Terms
              </a>{" "}
              and{" "}
              <a href="#" className="font-medium text-gray-400 hover:text-white transition-colors">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Separator() {
  return (
    <div className="flex items-center w-full max-w-xs mt-5 md:mt-5 md:mb-5">
      <div className="flex-grow border-t border-[#37383B]"></div>
      <span className="mx-4 text-sm text-[#616168]">Sign In</span>
      <div className="flex-grow border-t border-[#37383B]"></div>
    </div>
  );
}

function PokemonGrid() {
  return (
    <div className="flex items-center justify-center md:justify-start gap-1.5">
      {POKEMON_GRID.map((pokemon) => (
        <img
          key={pokemon.id}
          src={`https://steady-gaufre-1267b2.netlify.app/${pokemon.id}.png`}
          alt={pokemon.name}
          className="w-10.5 h-10.5 object-contain"
          title={pokemon.name}
        />
      ))}
    </div>
  );
}

// ----- Imagem de fundo -----
function ImageBg() {
  return (
    <div
      className="
        absolute lg:top-20 lg:right-60 w-full h-[40vh] sm:h-[50vh]
        md:h-[600px] md:w-[60%] lg:h-[650px] lg:w-[60%]
        flex items-center justify-center overflow-hidden
        rounded-none md:rounded-[2rem] lg:rounded-[2rem]
      "
    >
      <img
        src={LoginBg}
        className="w-full h-full object-contain md:object-cover select-none"
        alt="Background"
      />
    </div>
  );
}

// ----- Footer -----
function Footer() {
  return (
    <footer className="w-full py-8 flex flex-col items-center justify-center gap-4 bg-[#18181B] select-none">
      <div className="flex text-[#818182] gap-5 text-sm">
        <a
          href="https://discord.com/channels/1174034150462861324/1444561443377909802"
          className="hover:text-white transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          Discord
        </a>
        <a
          href="https://github.com/lumitylabs/gymleader"
          className="hover:text-white transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <a
          href="https://www.youtube.com/watch?v=AwelMLjpMAk"
          className="hover:text-white transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          YouTube
        </a>

      </div>
      <a
        href="https://lumitylabs.com/"
        className="text-xs text-[#818182] hover:text-white transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        <img src={LumityFooter} alt="Powered by Lumity" />
      </a>
    </footer>
  );
}

// ----- Componente principal de Login (com SimpleBar) -----
function Login() {
  return (
    <SimpleBar style={{ maxHeight: "100vh" }} className="login-page-scrollbar">
      <div className="bg-[#18181B] font-inter text-white overflow-hidden">
        <Navbar />
        <main
          className="
            relative min-h-screen flex flex-col justify-start items-center
            md:flex-row md:justify-center md:items-center
            md:overflow-visible pb-16 md:pb-0
          "
        >
          <ImageBg />
          <LoginModal />
        </main>

        {/* Elemento necessário pelo Clerk para inicializar Smart CAPTCHA widget.
            O log "Cannot initialize Smart CAPTCHA widget because the clerk-captcha DOM element was not found"
            desaparece se esse elemento existir quando Clerk tentar inicializar. */}
        <div id="clerk-captcha" style={{ display: "none" }} />

        <Footer />
      </div>
    </SimpleBar>
  );
}

export default Login;
