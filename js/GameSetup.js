export class GameSetup {
    constructor(controls) {
        this.controls = controls;
        this.btnPlay = document.getElementById('btnPlay');
        this.difficultySelect = document.getElementById('difficultySelect');
        this.loadingStatus = document.getElementById('loading-status');
        this.blocker = document.getElementById('blocker');

        // Oculta a interface quando o jogo entra em ecrã inteiro (PointerLock)
        this.controls.addEventListener('lock', () => {
            this.blocker.style.display = 'none';
        });
        
        // Mostra a interface quando o utilizador pressiona ESC
        this.controls.addEventListener('unlock', () => {
            this.blocker.style.display = 'flex';
        });
    }

    onPlayClicked(callback) {
        this.btnPlay.addEventListener('click', () => {
            const difficulty = this.difficultySelect.value;
            callback(difficulty);
        });
    }

    showLoading(isLoading) {
        if (isLoading) {
            this.loadingStatus.classList.remove('hidden');
            this.btnPlay.disabled = true;
            this.btnPlay.innerText = 'A CARREGAR...';
            this.btnPlay.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            this.loadingStatus.classList.add('hidden');
            this.btnPlay.disabled = false;
            this.btnPlay.innerText = 'INICIAR SIMULAÇÃO';
            this.btnPlay.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}