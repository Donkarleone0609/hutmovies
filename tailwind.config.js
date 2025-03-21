export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      keyframes: {
        'modal-up': {
          '0%': { transform: 'translateY(30px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        'fade-in': {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(30px)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-30px)', opacity: 0 },
          '100%': { transform: 'translateX(0)', opacity: 1 },
        },
        'pulse-loading': {
          '0%, 100%': { opacity: 0.6 },
          '50%': { opacity: 0.9 },
        },
        'smoke': {
          '0%': { transform: 'translate(0, 0) scale(0.5)', opacity: 0 },
          '10%': { opacity: 0.7 },
          '40%': { transform: 'translate(0, -20px) scale(1)', opacity: 0.4 },
          '100%': { transform: 'translate(0, -40px) scale(1.5)', opacity: 0 },
        },
        'error-shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-5px)' },
          '40%, 80%': { transform: 'translateX(5px)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'sparks': {
          '0%': { transform: 'translate(0, 0) rotate(0deg)', opacity: 0 },
          '10%': { opacity: 1 },
          '50%': { transform: 'translate(var(--tx), var(--ty)) rotate(var(--r))', opacity: 0.8 },
          '100%': { transform: 'translate(calc(var(--tx) * 0.5), calc(var(--ty) * 2)) rotate(calc(var(--r) * 2))', opacity: 0 },
        },
        'spark-ping': {
          '75%, 100%': { transform: 'scale(2)', opacity: 0 },
        },
        'boomerang': {
          '0%': { transform: 'translateX(0) scale(1) rotate(0deg)', opacity: 0.2 },
          '15%': { transform: 'translateX(40px) scale(1.2) rotate(90deg)', opacity: 1 },
          '30%': { transform: 'translateX(80px) scale(1) rotate(180deg)', opacity: 0.8 },
          '50%': { transform: 'translateX(40px) scale(0.8) rotate(270deg)', opacity: 1 },
          '65%': { transform: 'translateX(0) scale(1) rotate(360deg)', opacity: 0.8 },
          '85%': { transform: 'translateX(-20px) scale(1.1) rotate(420deg)', opacity: 0.5 },
          '100%': { transform: 'translateX(0) scale(1) rotate(480deg)', opacity: 0.2 },
        },
        'glitch': {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-4px, 4px)' },
          '40%': { transform: 'translate(-4px, -4px)' },
          '60%': { transform: 'translate(4px, 4px)' },
          '80%': { transform: 'translate(4px, -4px)' },
          '100%': { transform: 'translate(0)' },
        },
        'bounce-fall': {
          '0%': { transform: 'translateY(-100%) rotate(0deg)', opacity: 0 },
          '10%': { opacity: 1 },
          '20%': { transform: 'translateY(0) rotate(60deg)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
          '40%': { transform: 'translateY(-10%) rotate(120deg)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
          '60%': { transform: 'translateY(0) rotate(240deg)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
          '80%': { transform: 'translateY(-5%) rotate(300deg)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
          '100%': { transform: 'translateY(100%) rotate(360deg)', opacity: 0 },
        },
      },
      animation: {
        'modal-up': 'modal-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slide-down 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-loading': 'pulse-loading 1.5s ease-in-out infinite',
        'smoke': 'smoke 1.8s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite',
        'error-shake': 'error-shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'float': 'float 3s ease-in-out infinite',
        'sparks': 'sparks 1s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite',
        'spark-ping': 'spark-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'boomerang': 'boomerang 2s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite',
        'glitch': 'glitch 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) infinite',
        'bounce-fall': 'bounce-fall 3s linear forwards',
      },
    },
  },
}