const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

app.use(express.static(path.join(__dirname, "../frontend")));

// O banco continua no backend/db.json
const DB_FILE = path.join(__dirname, "../backend/db.json");

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    return {
      usuarios: [],
      pacientes: [],
      triagens: [],
      consultas: [],
      tv_chamada: null,
      tv_historico: []
    };
  }

  const db = JSON.parse(
    fs.readFileSync(DB_FILE, "utf8")
  );

  if (!db.usuarios) db.usuarios = [];
  if (!db.pacientes) db.pacientes = [];
  if (!db.triagens) db.triagens = [];
  if (!db.consultas) db.consultas = [];
  if (!db.tv_chamada) db.tv_chamada = null;
  if (!db.tv_historico) db.tv_historico = [];

  return db;
}

function writeDB(data) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

// ===============================
// LOGIN
// ===============================

app.post("/login", (req, res) => {
  try {
    const usuario = String(req.body.usuario || "").trim();
    const senha = String(req.body.senha || "");

    if (!usuario || !senha) {
      return res.status(400).json({
        sucesso: false,
        erro: "Usuário e senha são obrigatórios."
      });
    }

    const db = readDB();

    const user = db.usuarios.find(u =>
      String(u.usuario).trim() === usuario &&
      String(u.senha) === senha
    );

    if (!user) {
      return res.status(401).json({
        sucesso: false,
        erro: "Usuário ou senha inválidos."
      });
    }

    if (!user.tipo) {
      return res.status(500).json({
        sucesso: false,
        erro: "Usuário sem tipo de acesso."
      });
    }

    console.log(
      `Login realizado: ${user.usuario} - ${user.tipo}`
    );

    res.json({
      sucesso: true,
      usuario: user.usuario,
      tipo: user.tipo
    });

  } catch (error) {
    console.error("Erro no login:", error);

    res.status(500).json({
      sucesso: false,
      erro: "Erro interno no servidor."
    });
  }
});

// ===============================
// ATENDIMENTO
// ===============================

app.post("/atendimento", (req, res) => {
  try {
    const db = readDB();

    const paciente = {
      id: Date.now(),
      nome: req.body.nome,
      cpf: req.body.cpf,
      tipo: req.body.tipo,
      status: "triagem",
      createdAt: new Date()
    };

    db.pacientes.push(paciente);

    writeDB(db);

    res.json(paciente);

  } catch (error) {
    console.error("Erro no atendimento:", error);

    res.status(500).json({
      erro: "Não foi possível cadastrar o paciente."
    });
  }
});

// ===============================
// LISTAR PACIENTES
// ===============================

app.get("/pacientes", (req, res) => {
  const db = readDB();

  res.json(db.pacientes);
});

// ===============================
// TRIAGEM
// ===============================

app.post("/triagem", (req, res) => {
  try {
    const db = readDB();

    let risco = req.body.risco;

    if (req.body.temperatura >= 39) {
      risco = "vermelho";
    } else if (req.body.temperatura >= 38) {
      risco = "amarelo";
    } else if (!risco) {
      risco = "verde";
    }

    const triagem = {
      id: Date.now(),
      nome: req.body.nome,
      sintoma: req.body.sintoma,
      temperatura: req.body.temperatura,
      alergia: req.body.alergia,
      observacao: req.body.observacao,
      risco,
      status: "aguardando_medico",
      createdAt: new Date()
    };

    db.triagens.push(triagem);

    writeDB(db);

    res.json(triagem);

  } catch (error) {
    console.error("Erro na triagem:", error);

    res.status(500).json({
      erro: "Não foi possível salvar a triagem."
    });
  }
});

// ===============================
// LISTAR TRIAGENS
// ===============================

app.get("/triagens", (req, res) => {
  const db = readDB();

  res.json(db.triagens);
});

// ===============================
// LISTA DE MEDICAÇÕES
// ===============================

app.get("/lista-medicacoes", (req, res) => {
  res.json([
    "Dipirona",
    "Paracetamol",
    "Ibuprofeno",
    "Amoxicilina",
    "Azitromicina",
    "Loratadina",
    "Omeprazol",
    "Buscopan",
    "Dramin",
    "Soro fisiológico"
  ]);
});

// ===============================
// CONSULTA
// ===============================

app.post("/consulta", (req, res) => {
  try {
    const db = readDB();

    const consulta = {
      id: Date.now(),
      paciente: req.body.paciente,
      diagnostico: req.body.diagnostico,
      medicacao: req.body.medicacao,
      obs: req.body.obs,
      createdAt: new Date()
    };

    db.consultas.push(consulta);

    writeDB(db);

    res.json(consulta);

  } catch (error) {
    console.error("Erro na consulta:", error);

    res.status(500).json({
      erro: "Não foi possível salvar a consulta."
    });
  }
});

// ===============================
// MEDICAÇÕES
// ===============================

app.get("/medicacoes", (req, res) => {
  const db = readDB();

  res.json(db.consultas);
});

// ===============================
// EXPORTAÇÃO
// ===============================

module.exports = app;
