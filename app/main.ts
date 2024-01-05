import * as dotenv from 'dotenv';
dotenv.config();

import User from "../api/client";

const cpf = process.env.CPF || ''
const password = process.env.PASSWORD || ''
const user = new User(cpf, password);

user.login().then(() => {
  user.get_components().then((history) => {
    console.log(history)
  })
})