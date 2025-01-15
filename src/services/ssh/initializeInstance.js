import { NodeSSH } from "node-ssh";

export async function initializeInstance(ip) {
  const ssh = new NodeSSH();

  try {
    await ssh.connect({
      host: ip,
      username: "root",
      password: process.env.DIGITALOCEAN_SSH_PASSWORD,
      tryKeyboard: true,
    });

    const commands = [
      "if ! swapon -s | grep -q /swapfile; then sudo swapon /swapfile && true; fi",
      `if [ ! -d "/root/ClientFyAdmin" ]; then git clone https://github.com/ossavemu/ClientFyAdmin.git /root/ClientFyAdmin; fi`,
      "cd /root/ClientFyAdmin",
      "git init && true",
      "git config --global --add safe.directory /root/ClientFyAdmin && true",
      "git config --global --add safe.directory /root/ClientFyAdmin && true",
      "git config core.fileMode false && true",
      // Configurar el repositorio remoto
      "git remote remove origin && true",
      "git remote add origin https://github.com/ossavemu/ClientFyAdmin.git && true",
      // Obtener los últimos cambios
      "git fetch origin && true",
      "git checkout master && git checkout -b master && true",
      "git pull origin master && true",
      // Asegurarnos de que pnpm está instalado
      "command -v pnpm || npm install -g pnpm",
      // Instalar solo dependencias faltantes sin borrar las existentes
      "cd /root/ClientFyAdmin && pnpm install --no-frozen-lockfile",
      // Eliminar la carpeta bot_sessions y el archivo QR
      "rm -rf /root/ClientFyAdmin/bot_sessions",
      "rm -f /root/ClientFyAdmin/bot.qr.png",
      // Reiniciar la aplicación
      `pkill -f "pnpm start" && true`,
      `screen -S clientfy -d -m bash -c "cd /root/ClientFyAdmin && pnpm start > app.log 2>&1"`,
    ];

    for (const cmd of commands) {
      console.log(`Ejecutando: ${cmd}`);
      const result = await ssh.execCommand(cmd);
      if (result.stderr && !cmd.includes("|| true")) {
        throw new Error(`Error ejecutando comando ${cmd}: ${result.stderr}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log("Inicialización completada exitosamente");
  } catch (error) {
    console.error("Error en la inicialización:", error);
    throw error;
  } finally {
    ssh.dispose();
  }
}
