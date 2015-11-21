package main

import (
  "bytes"
  "fmt"
  "os"
  "log"
  "os/exec"
  "strings"
)

func installNpmModules(name string, prefix string) {
  dir, errr := os.Getwd()
  if errr != nil {
    log.Fatal(errr)
    os.Exit(1)
  }
  cmdName := dir + "/node_modules/.bin/npm"
  cmdArgs := []string{"install", name, "--prefix",  prefix}
  cmd := exec.Command(cmdName, cmdArgs...)
  err := cmd.Run()
  if err != nil {
    log.Fatal(err)
  }
  cmd.Stdin = strings.NewReader("")
  var out bytes.Buffer
  cmd.Stdout = &out
  fmt.Printf("%q\n", out.String())
}

func main() {
  args := os.Args
  fmt.Printf(args[1], args[2])
  installNpmModules(args[1], args[2])
}