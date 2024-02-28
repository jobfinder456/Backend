const express = require("express")
const { getData } = require('../db/job')
const app = express()

function rootrouter(){
    app.get("/list", async(req,res)=>{
      const all = await getData()
      res.json({
        all
      })
    })
}