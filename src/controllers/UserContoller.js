import { tokenToUser } from "../middleware/authMiddleware.js";
import { Op } from "sequelize";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { filterByFullName } from "../utils/filters.js";

const cpfFilter = (cpf) => cpf.replace(/[^0-9]/g, "");
const jwtToken = process.env.JWT_SECRET || "ABC";

const generateToken = (id) => {
  return jwt.sign({ id }, jwtToken, {
    expiresIn: "3d",
  });
};

class UserController {
  async login(req, res) {
    try {
      const { cpf, password } = req.body;
      const user = await User.findByPk(cpfFilter(cpf));
      if (!user) {
        return res.status(401).json({
          error: "Usuário inexistente",
          message: "Usuário inexistente",
        });
      }
      if (!user.accepted) {
        return res.status(401).json({
          message: "Usuário não aceito",
        });
      }
      if (user.password === password) {
        let expiresIn = new Date();
        expiresIn.setDate(expiresIn.getDate() + 3);
        if (
          user.email !== "email@emaill.com" &&
          user.email !== "email@email.com"
        ) {
          user.set({ firstLogin: false });
          await user.save();
        }
        return res.status(200).json({
          cpf: user.cpf,
          fullName: user.fullName,
          email: user.email,
          idUnit: user.idUnit,
          token: generateToken(user.cpf),
          idRole: user.idRole,
          expiresIn,
        });
      } else {
        return res.status(401).json({
          error: "Impossível autenticar",
          message: "Senha ou usuário incorretos",
        });
      }
    } catch (error) {
      return res.status(500).json({ error, message: "erro inesperado" });
    }
  }

  async getByIdParam(req, res) {
    const cpf = req.params.id;
    try {
      const userRaw = await User.findByPk(cpf);

      if (!userRaw) {
        return res.status(204).json({ error: "Usuário não existe" });
      } else {
        const user = {
          cpf: userRaw.cpf,
          fullName: userRaw.fullName,
          email: userRaw.email,
          accepted: userRaw.accepted,
          idUnit: userRaw.idUnit,
          idRole: userRaw.idRole,
          firstLogin: userRaw.firstLogin,
        };
        return res.status(200).json(user);
      }
    } catch (error) {
      return res.status(500).json({
        error,
        message: "Erro ao buscar usuário",
      });
    }
  }

  async allUser(req, res) {
    try {
      let where;

      const { idUnit, idRole } = await tokenToUser(req);
      const unitFilter = idRole === 5 ? {} : { idUnit };
      where = {
        ...filterByFullName(req),
        ...unitFilter,
      };

      if (req.query.accepted) {
        const { accepted } = req.query;
        let users;
        let totalCount;
        let totalPages;

        if (accepted === "true") {
          users = await User.findAll({
            where: { accepted: true, idRole: { [Op.ne]: 5 }, ...where },
            offset: req.query.offset,
            limit: req.query.limit,
          });
          totalCount = await User.count({
            where: { accepted: true, idRole: { [Op.ne]: 5 }, ...where },
          });
          totalPages = Math.ceil(totalCount / parseInt(req.query.limit, 10));
        } else if (accepted === "false") {
          users = await User.findAll({
            where: { accepted: false, idRole: { [Op.ne]: 5 }, ...where },
            offset: req.query.offset,
            limit: req.query.limit,
          });
          totalCount = await User.count({
            where: { accepted: false, idRole: { [Op.ne]: 5 }, ...where },
          });
          totalPages = Math.ceil(totalCount / parseInt(req.query.limit, 10));
        } else {
          return res.status(400).json({
            message: "O parâmetro accepted deve ser 'true' ou 'false'",
          });
        }

        users = users.map((user) => {
          return {
            cpf: user.cpf,
            fullName: user.fullName,
            email: user.email,
            accepted: user.accepted,
            idUnit: user.idUnit,
            idRole: user.idRole,
          };
        });

        return res.status(200).json({ users: users || [], totalPages });
      } else {
        const users = await User.findAll({
          where: {
            idRole: { [Op.ne]: 5 },
            ...where,
          },
        });

        const mappedUsers = users.map((user) => {
          return {
            cpf: user.cpf,
            fullName: user.fullName,
            email: user.email,
            accepted: user.accepted,
            idUnit: user.idUnit,
            idRole: user.idRole,
          };
        });

        return res.status(200).json({ users: mappedUsers || [] });
      }
    } catch (error) {
      return res.status(500).json({
        error,
        message: "Erro ao listar usuários aceitos ou não",
      });
    }
  }

  async store(req, res) {
    const { fullName, cpf, email, password, idUnit, idRole } = req.body;

    try {
      const user = await User.create({
        fullName,
        cpf: cpfFilter(cpf),
        email,
        password,
        accepted: false,
        idUnit,
        idRole,
        firstLogin: true,
      });
      return res.status(200).json(user);
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        const errorMessages = {
          cpf: "Este CPF já foi cadastrado na plataforma.",
          email: "Este e-mail já foi cadastrado na plataforma.",
        };

        const duplicatedField = error.errors[0].path;
        const errorMessage =
          errorMessages[duplicatedField] || "Já existe um registro duplicado.";

        return res
          .status(400)
          .json({ error: "Campo duplicado.", message: errorMessage });
      }

      return res.status(500).json(error);
    }
  }

  async updateUser(req, res) {
    try {
      const cpf = req.params.id;
      const user = await User.findByPk(cpf);
      const newEmail = req.body.email;

      if (!user) {
        return res.status(204).json({});
      } else {
        user.set({ email: newEmail });
        await user.save();
        return res.status(200).json({
          message: "Email atualizado com sucesso",
        });
      }
    } catch (error) {
      return res.status(500).json({
        error,
        message: "Impossível atualizar email",
      });
    }
  }

  async updateRole(req, res) {
    try {
      const { idRole, cpf } = req.body;
      const user = await User.findByPk(cpf);

      if (!user) {
        return res.status(204).json({});
      } else {
        user.set({ idRole: idRole });
        await user.save();
        return res.status(200).json({
          message: "Papel atualizado com sucesso",
        });
      }
    } catch (error) {
      return res.status(500).json({ message: "Usuário não atualizado!" });
    }
  }

  async editPassword(req, res) {
    try {
      const cpf = req.params.id;
      const { oldPassword, newPassword } = req.body;
      const user = await User.findByPk(cpf);
      if (!user) {
        return res.status(204).json({});
      }

      if (oldPassword === user.password) {
        user.set({ password: newPassword });
        await user.save();
        return res
          .status(200)
          .json({ message: "Usuário atualizado com sucesso!" });
      } else {
        return res.status(400).json({ message: "Senha inválida!" });
      }
    } catch (error) {
      return res.status(500).json({
        error,
        message: "Erro a atualizar usuário ",
      });
    }
  }

  async deleteByParam(req, res) {
    const cpf = req.params.id;
    try {
      const user = await User.findByPk(cpf);

      if (!user) {
        return res.status(404).json({ error: "Usuário não existe!" });
      } else {
        await user.destroy();
        return res.status(200).json({
          message: "Usuário apagado com sucesso",
        });
      }
    } catch (error) {
      return res.status(500).json({
        error,
        message: "Erro ao apagar usuário",
      });
    }
  }

  async acceptRequest(req, res) {
    try {
      const cpf = req.params.id;
      const user = await User.findByPk(cpf);

      if (!user) {
        res.status(404).json({ error: "Usuário não existe" });
      } else {
        user.set({ accepted: true });
        await user.save();
        return res.status(200).json({
          message: "Usuário aceito com sucesso",
        });
      }
    } catch (error) {
      return res.status(500).json({
        error,
        message: "Falha ao aceitar usuário",
      });
    }
  }

  async deleteRequest(req, res) {
    try {
      const cpf = req.params.id;
      const user = await User.findByPk(cpf);

      if (!user) {
        res.status(404).json({ error: "Usuário não existe" });
      } else {
        await user.destroy();
        return res.status(200).json({
          message: "Usuário não aceito foi excluído",
        });
      }
    } catch (error) {
      return res.status(500).json({
        error,
        message: "Erro ao negar pedido do usuário",
      });
    }
  }

  async updateUserEmailAndPassword(req, res) {
    try {
      const { email, password } = req.body;
      const { id } = req.params;

      const user = await User.findByPk(id);
      if (!user) {
        return res
          .status(404)
          .json({ message: "Nenhum usuário foi encontrado" });
      } else {
        user.set({ email: email, password: password, firstLogin: false });
        await user.save();
        return res.status(200).json(user);
      }
    } catch (error) {
      return res.status(500).json({
        error,
        message: "Impossível atualizar email",
      });
    }
  }
}

export default new UserController();
