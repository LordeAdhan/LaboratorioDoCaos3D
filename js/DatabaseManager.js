export class DatabaseManager {
    async fetchRandomMolecule(difficulty) {
        // Simula o tempo de resposta do servidor WampServer
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ 
                    id: 1, 
                    iupac_name: "Metilpropano", 
                    difficulty: difficulty 
                });
            }, 1000);
        });
    }
}