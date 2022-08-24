const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const crypto = require("crypto")
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("views"));

var bool = false;
var login_states
var login_status = false;
var login_mail

const MongoClient = require("mongodb").MongoClient;
const e = require('express');
const { runInNewContext } = require('vm');
var db;
MongoClient.connect(
  "mongodb+srv://Tfadmin:qwerty1111@tfteam.aqtsspy.mongodb.net/?retryWrites=true&w=majority",
  (err, client) => {
    if (err) return console.log(err);
    db = client.db("petitionWeb");

    app.listen(8080, () => {
      console.log("http://localhost:8080");
    });
  }
);

app.get("/", (req, res) => {
  db.collection("petitions")
    .find()
    .toArray(function (err, result) {
      console.log(result);
      console.log(login_status)
      res.render("home", { posts: result, login_state: login_states });
    });
});

app.get("/write", (req, res) => {
  if (login_status == true) {
    res.render("write", { login_state: login_states });
  }
  else {
    res.send(
      '<script>alert("로그인을 먼저 해주세요");window.location="/"</script>'
    );
  }
});

let localDate = new Date().toLocaleDateString();


function changeDate(localDate) {
  var year = parseInt(localDate.substring(0, 4))
  var month = parseInt(localDate.substring(6, 7))
  var date = parseInt(localDate.substring(9, 11))
  if (month == 2) {
    if (date + 14 > 29) {
      month++;
      date = date + 14 - 29;
    }
    else {
      date += 14;
    }
  }
  else if (month == 1 || month == 3 || month == 5 || month == 7 || month == 8 || month == 10 || month == 12) {
    if (date + 14 > 31) {

      date = date + 14 - 31;
      if (month == 12) {
        month = 1;
      }
      else {
        month++;
      }
    }
    else {
      date += 14;
    }
  }
  else {
    if (date + 14 > 30) {
      month++;
      date = date + 14 - 30;
    }
    else {
      date += 14;
    }
  }
  return (year * 10000 + month * 100 + date);
}

app.post("/add", (req, res) => {
  db.collection("counter").findOne({ name: "postNum" }, (err, result) => {
    var totalPetitions = result.totalPost;
    db.collection("petitions").insertOne(
      {
        _id: totalPetitions + 1,
        청원제목: req.body.title,
        청원내용: req.body.markdown,
        status: "start",
        청원기간: changeDate(localDate),
        익명여부: req.body.anonymous,
        liked: 0,
        author: login_states
      },
      () => {
        console.log("저장완료");
        db.collection("counter").updateOne(
          { name: "postNum" },
          { $inc: { totalPost: 1 } },
          (err, result) => {
            if (err) return console.log(error);
          }
        );
        res.render('done', { login_state: login_states })
      }
    );
  });
});

app.get("/detail/:id", (req, res) => {
  db.collection("petitions").findOne(
    { _id: parseInt(req.params.id) },
    (err, result) => {
      console.log(result);
      res.render("detail", { data: result, login_state: login_states })
    }
  );
});

app.get("/listpetition", (res, rep) => {
  db.collection("petitions")
    .find()
    .toArray(function (err, result) {

      db.collection("counter").findOne({ name: "postNum" }, (err, rez) => {
        console.log(result)
        console.log(rez.totalPost)

        rep.render("petitionlist", { login_state: login_states, lengthpetition: rez.totalPost, array: result })
      })
    })


})





app.post("/vote/:id", (req, res) => {
  if (login_status == true) {
    db.collection("acc").findOne({ mail: login_mail }, (err, result) => {
      console.log(req.params.id)
      for (var object in result.likedId) {
        if (object == req.params.id) {
          bool = true;
        }
      }
      if (bool == false) {
        db.collection("acc").updateOne(
          { mail: login_mail },
          { $push: { likedId: req.params.id } }, (err, result) => {
            db.collection("petitions").updateOne(
              { _id: parseInt(req.params.id) },
              { $inc: { liked: 1 } }, (err, result) => {
                console.log("voted")
                res.send(
                  '<script>alert("동의해주셔서 감사합니다");window.location="/"</script>'
                );
              }
            );
          }
        )

      }
      else if (bool == true) {
        res.send(
          '<script>alert("이미 동의하신 청원입니다");window.location="/"</script>'
        );
        bool = false;
      }
    })
  }
  else {
    res.send(
      '<script>alert("로그인 이후 사용해 주세요");window.location="/"</script>'
    );
  }
})

// app.get("/", (req, rep) => {
//   rep.render("main.ejs");
// });

app.get("/login", (req, rep) => {
  rep.render("login", { login_state: login_states });
});
app.get("/petition", (req, rep) => {
  rep.render("home", { login_state: login_states });
});
app.get("/register", (req, rep) => {
  rep.render("register", { login_state: login_states });
});
app.get("/done", (req, res) => {
  res.render("done", { login_state: login_states });
});

app.post("/register", (req, rep) => {
  db.collection("acc").findOne({ mail: req.body.mail }, (err, result) => {
    if (result != null) {
      rep.send(
        '<script>alert("이미 존재하는 계정입니다");window.location="/"</script>'
      )

    } else {
      rep.send(
        '<script>alert("회원가입이 완료되었습니다");window.location="/"</script>'
      );
      db.collection("counter").findOne({ name: "countacc" }, (err, result) => {

        try {
          var accNum = result.totalacc;
          let hashedPass = crypto.createHash("sha256").update(req.body.password).digest("base64")
          console.log(hashedPass)
          console.log("mail:", req.body.mail);
          console.log("password:", hashedPass);

          db.collection("acc").insertOne(
            {
              _id: accNum + 1,
              name: req.body.name,
              mail: req.body.mail,
              pass: hashedPass,
            },
            () => {
              db.collection("counter").updateOne(
                { name: "countacc" },
                { $inc: { totalacc: 1 } },
                (err, result) => {
                  if (err) return console.log(error);
                }
              );
            }
          )
        } catch {
          rep.redirect("/register");
        }
      })
    }
  })

});

app.post("/login", (req, rep) => {
  db.collection("counter").findOne({ name: "countacc" }, (err, result) => {

    db.collection("acc").findOne({ mail: req.body.loginmail }, (err, res) => {

      if (res == null) {
        console.log('mail incorrectly directed')
        rep.send(
          '<script>alert("존재하지 않는 계정입니다");window.location="/register"</script>'
        );

      } else {

        console.log(res)
        console.log(req.body.loginmail)
        let inputPass = crypto.createHash("sha256").update(req.body.loginpassword).digest("base64")
        console.log(inputPass)

        if ((req.body.loginmail) == (res.mail)) {
          console.log("mail correctly directed")

          if (inputPass == res.pass) {
            console.log("password correctly directed")
            console.log(req.body.loginmail)
            login_mail = req.body.loginmail
            login_states = res.name
            login_status = true;
            rep.send(
              '<script>alert("로그인이 완료되었습니다");window.location="/"</script>'
            );
          } else {
            console.log("password incorrectly directed")
            rep.send(
              '<script>alert("메일 혹은 비밀번호가 올바르지 않습니다");window.location="/login"</script>'
            );


          }
        } else {
          console.log("mail incorrectly directed")
          rep.send(
            '<script>alert("메일 혹은 비밀번호가 올바르지 않습니다");window.location="/login"</script>'
          );


        }
      }


    })


  })
})

app.get('/test', (rep, req) => {
  let digest2 = crypto.createHash("sha256").update("anggi").digest("base64")
  console.log(digest2)
  db.collection("acc").findOne({ pass: bcrypt.hash("asd", 10) }, (err, result) => {
    console.log(result)
  })
})
