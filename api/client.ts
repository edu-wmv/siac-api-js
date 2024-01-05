"use strict";

import axios, { AxiosResponse } from 'axios';
import { encode, escape, stringify } from 'querystring';
const cheerio = require('cheerio');

class User {
  url = "https://siac.ufba.br";
  paths: Record<string, string> = {
    "login": "/SiacWWW/LogonSubmit.do",
    "get_components": "/SiacWWW/ConsultarComponentesCurricularesCursados.do"
  }
  auth_response: AxiosResponse;
  cookie_session: string | undefined = undefined;

  constructor(private username: string, private password: string) {
    this.username = username;
    this.password = password;
    this.auth_response = {} as AxiosResponse;
  }

  get_url(path: string) {
    return this.url + this.paths[path];
  }

  get_headers() {
    return {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://siac.ufba.br',
      'Pragma': 'no-cache',
      'Referer': 'https://siac.ufba.br/SiacWWW/Logoff.do',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="114", "Google Chrome";v="114"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Linux"',
    }
  }

  async login(username: string = this.username, password: string = this.password) {
    this.username = username;
    this.password = password;

    let result = await axios.post(this.get_url("login"), {
      'cpf': this.username, 
      'senha': this.password,
      'x': '28',
      'y': '11'
      }, 
      {
        headers: this.get_headers(),
      })
    
    // this func does not handle when user does not exist
    // it only loads the page and returns the response
    if (result.status == 200) {
      this.auth_response = result.data;
      this.cookie_session = (result.headers['set-cookie'] as string[])
        .find(cookie => cookie.includes("JSESSIONID"))
        ?.match(new RegExp(`^JSESSIONID=(.+?);`))
        ?.[1]
      console.log('login successful')
      console.log(this.cookie_session)
      return this;
    } else {
      throw new Error("Cannot reach login page (error)");
    }
  }

  async get_components() {
    if (!this.cookie_session) {
      throw new Error("You must login first");
    }

    let semester = ''
    const history: Record<string, string>[] = []

    let response = await axios.get(this.get_url("get_components"), {
      headers: {
        'Cookie': `JSESSIONID=${this.cookie_session}`,
        ...this.get_headers()
      },
      withCredentials: true,
      responseType: 'arraybuffer',
      responseEncoding: 'latin1'
    })
   
    if (response.status !== 200) {
      throw new Error("Cannot reach components page (error)");
    }

    const $ = cheerio.load(response.data.toString('latin1'));
    const rows = $('table.corpoHistorico').find('tr');
    
    rows.each((i: number, row: any) => {
      const cells = $(row).find('td');

      // the cell must follow the pattern
      if (cells.length !== 8) {
        return
      }

      if ($(cells[0]).find('b').length > 0) {
        semester = $(cells[0]).find('b').text().trim()
      }

      if ($(cells[1]).text().trim().length > 3) {
        let title = $(cells[2]).text().trim()
        history.push({
          "semestre": semester,
          "cod": $(cells[1]).text().trim(),
          "titulo": title.normalize("NFD").replace(/\p{Diacritic}/gu, ""),
          "desc": $(cells[3]).text().trim(),
          "cred": $(cells[4]).text().trim(),
          "nat": $(cells[5]).text().trim(),
          "nota": $(cells[6]).text().trim(),
          "res": $(cells[7]).text().trim(),
        })
      }
    })

    return history
  }
}

export default User;