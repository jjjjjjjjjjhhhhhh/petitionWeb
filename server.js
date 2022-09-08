const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const crypto = require("crypto");
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("views"));

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({ secret: 'secretcode', resave: true, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

var bool = false;
var login_states;
var login_status = false;
var login_mail;

let localDate = new Date().toLocaleDateString();


var arr = [];

const MongoClient = require("mongodb").MongoClient;
const e = require("express");
const { runInNewContext } = require("vm");
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
      console.log(login_status);
      console.log(findWaiting(result));
      arr = [];
      res.render("home", {
        sortedPosts: highestVote(result),
        waiting: findWaiting(result),
        posts: result,
        info: req.user,
        replied: answered(result),
      });
    });
});

app.get("/ansed/:id", (req, res) => {
  res.render("ansed", { info: req.user });
  db.collection("petitions").findOne(
    { _id: parseInt(req.params.id) },
    (err, result) => {
      if (result.대답 == true) {
        res.render("ansed", { data: result, info: req.user, });
      } else {

        redirect("/");
      }
    }
  );
});

app.get("/write", loginStat, (req, res) => {
  // if (login_status == true) {
  res.render("write", { info: req.user });
  // } else {
  //   res.send(
  //     '<script>alert("로그인을 먼저 해주세요");window.location="/"</script>'
  //   );
  // }
});

app.post("/done",
  (req, res) => {
    db.collection("counter").findOne({ name: "postNum" }, (err, result) => {
      var totalPetitions = result.totalPost;
      var author;
      if (req.body.anonymous == null) {
        author = req.user.mail
      }
      else {
        author = req.user.name
      }
      console.log(req.body.anonymous)
      console.log(req.user)
      console.log(author)
      db.collection("petitions").insertOne(
        {
          _id: totalPetitions + 1,
          청원제목: req.body.title,
          청원내용: req.body.markdown,
          status: "start",
          청원시작: localDate,
          청원마감: changeDate(parseInt(localDate.substring(4,)), parseInt(localDate.substring(0, 2)), parseInt(localDate.substring(2,))),
          익명여부: req.body.anonymous,
          liked: 0,
          author: author,
        },
        () => {
          console.log("저장완료");
          db.collection("counter").updateOne(
            { name: "postNum" },
            { $inc: { totalPost: 1 } },
            (err, result) => {
              if (err) return console.log(error);
              res.render("done", { info: req.user });
            }
          );
        }
      );
    });
  });

app.get("/detail/:id", loginStat, (req, res) => {

  db.collection("petitions").findOne(
    { _id: parseInt(req.params.id) },
    (err, result) => {
      console.log(result);
      res.render("detail", { data: result, info: req.user });
    }
  );
});

app.get("/petitionlist", loginStat, (res, rep) => {
  db.collection("petitions")
    .find()
    .toArray(function (err, result) {
      console.log(result)
      rep.render("petition_list", { posts: result, info: res.user });
    });

});

app.get("/answered", loginStat, (res, rep) => {
  db.collection("petitions")
    .find()
    .toArray(function (err, result) {
      rep.render("answeredPetitions", { posts: answered(result), info: res.user });
    });

});

app.get("/waiting", loginStat, (res, rep) => {
  db.collection("petitions")
    .find()
    .toArray(function (err, result) {
      rep.render("waiting", { posts: findWaiting(result), info: res.user });
    });

});

app.post("/vote/:id", loginStat, (req, res) => {

  db.collection("acc").findOne({ mail: req.user.mail }, (err, result) => {

    for (var object = 0; object <= result.likedId.length; object++) {
      if (result.likedId[object] == req.params.id) {
        res.send(
          '<script>alert("이미 동의하신 청원입니다");window.location="/"</script>'
        );
        return;
      }
    }
    db.collection("acc").updateOne(
      { mail: req.user.mail },
      { $push: { likedId: req.params.id } },
      (err, result) => {
        db.collection("petitions").findOne(
          { _id: parseInt(req.params.id) },
          (err, result) => {
            if (result.liked == 199) {
              db.collection("petitions").updateOne(
                { _id: parseInt(req.params.id) },
                { $set: { status: "waiting" } },
                (err, result) => {
                  console.log("sucess");
                }
              );
            }
          }
        );
        db.collection("petitions").updateOne(
          { _id: parseInt(req.params.id) },
          { $inc: { liked: 1 } },
          (err, result) => {
            console.log("voted");
            res.send(
              '<script>alert("동의해주셔서 감사합니다");window.location="/"</script>'
            );
          }
        );
      }
    );
  });
});

app.get("/login", (req, rep) => {
  rep.render("login", { info: req.user });
});
app.get("/petition", (req, rep) => {
  rep.render("home", { info: req.user });
});
app.get("/register", (req, rep) => {
  rep.render("register", { info: req.user });
});
app.get("/done", (req, res) => {
  res.render("done", { info: req.user });
});
app.get("/fail", (req, res) => {
  res.render('fail')
})
app.post("/register", (req, rep) => {
  db.collection("acc").findOne({ mail: req.body.mail }, (err, result) => {
    if (result != null) {
      rep.send(
        '<script>alert("이미 존재하는 계정입니다");window.location="/"</script>'
      );
    } else {
      db.collection("acc").findOne({ name: req.body.name }, (err, result) => {
        if (result != null) {
          rep.send(
            '<script>alert("이미 존재하는 닉네임입니다");window.location="/"</script>'
          );
        } else {
          rep.send(
            '<script>alert("회원가입이 완료되었습니다");window.location="/"</script>'
          );
          db.collection("counter").findOne(
            { name: "countacc" },
            (err, result) => {
              try {
                var accNum = result.totalacc;
                let hashedPass = crypto
                  .createHash("sha256")
                  .update(req.body.password)
                  .digest("base64");
                console.log(hashedPass);
                console.log("mail:", req.body.mail);
                console.log("password:", hashedPass);

                db.collection("acc").insertOne(
                  {
                    _id: accNum + 1,
                    name: req.body.name,
                    mail: req.body.mail,
                    pass: hashedPass,
                    likedId: [0],
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
                );
              } catch {
                rep.redirect("/register");
              }
            }
          );
        }
      });
    }
  });
});

// app.post("/login", (req, rep) => {
//   db.collection("counter").findOne({ name: "countacc" }, (err, result) => {
//     db.collection("acc").findOne({ mail: req.body.loginmail }, (err, res) => {
//       if (res == null) {
//         console.log("mail incorrectly directed");
//         rep.send(
//           '<script>alert("존재하지 않는 계정입니다");window.location="/register"</script>'
//         );
//       } else {
//         console.log(res);
//         console.log(req.body.loginmail);
//         let inputPass = crypto
//           .createHash("sha256")
//           .update(req.body.loginpassword)
//           .digest("base64");
//         console.log(inputPass);

//         if (req.body.loginmail == res.mail) {
//           console.log("mail correctly directed");

//           if (inputPass == res.pass) {
//             console.log("password correctly directed");
//             console.log(req.body.loginmail);
//             login_mail = req.body.loginmail;
//             login_states = res.name;
//             login_status = true;
//             rep.send(
//               '<script>alert("로그인이 완료되었습니다");window.location="/"</script>'
//             );
//           } else {
//             console.log("password incorrectly directed");
//             rep.send(
//               '<script>alert("메일 혹은 비밀번호가 올바르지 않습니다");window.location="/login"</script>'
//             );
//           }
//         } else {
//           console.log("mail incorrectly directed");
//           rep.send(
//             '<script>alert("메일 혹은 비밀번호가 올바르지 않습니다");window.location="/login"</script>'
//           );
//         }
//       }
//     });
//   });
// });

app.post('/login', passport.authenticate('local', {
  failureRedirect: "/fail"
}), function (req, rep) {
  rep.redirect('/')
})

passport.use(new LocalStrategy({
  usernameField: 'loginmail',
  passwordField: 'loginpassword',
  session: true,
  passReqToCallback: false,
}, function (inpid, inppass, done) {
  console.log(inpid, inppass)

  //console.log(입력한아이디, 입력한비번);
  db.collection('acc').findOne({ mail: inpid }, (err, res) => {
    if (err) return done(err)

    if (!res) return done(null, false, console.log('wrong mail'))

    let inputPass = crypto
      .createHash("sha256")
      .update(inppass)
      .digest("base64");
    if (inputPass == res.pass) {
      console.log('logged in successfully')
      return done(null, res)

    } else {
      return done(null, false, { message: '비번틀렸어요' })
    }
  })
}));

passport.serializeUser(function (user, done) {
  done(null, user.mail)
})

passport.deserializeUser(function (id, done) {
  db.collection('acc').findOne({ mail: id }, (err, res) => {
    done(null, res)
  })
})

app.get("/logout", (req, res) => {
  // login_states = null;
  // login_status = false;
  req.user = null;

  res.redirect("/");
});

app.get("/test", (rep, req) => {
  req.render("test");
  console.log(changeDate(localDate));
});

function loginStat(req, rep, next) {
  if (req.user) {
    next()
  } else {
    rep.send(
      '<script>alert("로그인 이후 사용해 주세요");window.location="/"</script>'
    );
  }
}
var testDate = "9/5/2022"
//함수

function changeDate(year, month, date) {
  if (month == 2) {
    if (date + 14 > 29) {
      month++;
      date = date + 14 - 29;
    } else {
      date += 14;
    }
  } else if (
    month == 1 ||
    month == 3 ||
    month == 5 ||
    month == 7 ||
    month == 8 ||
    month == 10 ||
    month == 12
  ) {
    if (date + 14 > 31) {
      date = date + 14 - 31;
      if (month == 12) {
        month = 1;
      } else {
        month++;
      }
    } else {
      date += 14;
    }
  } else {
    if (date + 14 > 30) {
      month++;
      date = date + 14 - 30;
    } else {
      date += 14;
    }
  }
  return month + "/" + date + "/" + year;
}

function answered(list) {
  for (var object in list) {
    if (list[object].status == "answered") {
      var obj = list[object];
      arr.push(obj);
    }
  }
  return arr;
}


function findWaiting(list) {
  for (var object in list) {
    if (list[object].status == "waiting") {
      var obj = list[object];
      arr.push(obj);
    }
  }
  return arr;
}

function highestVote(list) {
  array = list.sort(function (a, b) {
    return b.liked - a.liked;
  });
  return array;
}

