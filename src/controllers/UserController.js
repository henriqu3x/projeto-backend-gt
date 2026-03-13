import bcrypt from 'bcrypt';
import db from '../database/index.js';

const SALT_ROUNDS = 10;

function missingFields(payload, fields) {
  return fields.filter((field) => !payload?.[field]);
}

export async function getUserById(req, res) {
  const { id } = req.params;

  const user = await db.User.findByPk(id, {
    attributes: ['id', 'firstname', 'surname', 'email']
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.status(200).json(user);
}

export async function createUser(req, res) {
  const required = ['firstname', 'surname', 'email', 'password', 'confirmPassword'];
  const missing = missingFields(req.body, required);

  if (missing.length) {
    return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });
  }

  const { firstname, surname, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Password confirmation does not match' });
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const created = await db.User.create({ firstname, surname, email, password: hash });

    return res.status(201).json({
      id: created.id,
      firstname: created.firstname,
      surname: created.surname,
      email: created.email
    });
  } catch (err) {
    return res.status(400).json({ message: 'Unable to create user' });
  }
}

export async function updateUser(req, res) {
  const required = ['firstname', 'surname', 'email'];
  const missing = missingFields(req.body, required);

  if (missing.length) {
    return res.status(400).json({ message: `Missing fields: ${missing.join(', ')}` });
  }

  const { id } = req.params;
  const user = await db.User.findByPk(id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await user.update({
    firstname: req.body.firstname,
    surname: req.body.surname,
    email: req.body.email
  });

  return res.status(204).send();
}

export async function deleteUser(req, res) {
  const { id } = req.params;
  const user = await db.User.findByPk(id);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await user.destroy();
  return res.status(204).send();
}