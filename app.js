let player=""
let level=1

let a,b
let correct

let score=0
let tasks=0

function start(){
player=document.getElementById("player").value
level=Number(document.getElementById("level").value)

document.getElementById("start").style.display="none"
document.getElementById("game").style.display="block"

newTask()
}

function newTask(){

let unitA="cm"
let unitB="cm"

if(level==1){
a=random(2,12)
b=random(2,12)
}

if(level==2){
a=random(10,50)
b=random(10,50)
}

if(level==3){
a=random(1,10)
b=random(1,10)

unitA=Math.random()<0.5?"cm":"m"
unitB=Math.random()<0.5?"cm":"m"
}

let a_cm = unitA=="m"?a*100:a
let b_cm = unitB=="m"?b*100:b

correct=2*(a_cm+b_cm)

drawRect()

document.getElementById("task").innerHTML=
`Seiten: ${a} ${unitA} und ${b} ${unitB}<br>
Berechne den Umfang in cm`
}

function drawRect(){
let canvas=document.getElementById("rect")
let c=canvas.getContext("2d")

c.clearRect(0,0,300,200)
c.strokeRect(60,60,a*5,b*5)

c.font="16px Arial"
c.fillText(a,70,50)
c.fillText(b,40,90)
}

function check(){

let input=Number(document.getElementById("answer").value)

tasks++

if(input==correct){
score++
document.getElementById("feedback").innerHTML="✅ richtig"
sendResult(true)
}else{
document.getElementById("feedback").innerHTML=`❌ falsch – Lösung: ${correct}`
sendResult(false)
}

document.getElementById("score").innerHTML=`Punkte: ${score} / ${tasks}`
document.getElementById("answer").value=""

newTask()
}

function sendResult(ok){

fetch("https://DEIN-WORKER.workers.dev/result",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
name:player,
correct:ok,
score:score,
tasks:tasks,
time:Date.now()
})
})

}

function random(min,max){
return Math.floor(Math.random()*(max-min+1))+min
}