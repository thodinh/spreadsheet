import { evaluateCell } from "../helpers";

describe("operators", () => {
  //----------------------------------------------------------------------------
  // ADD
  //----------------------------------------------------------------------------

  test("ADD: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=ADD()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=ADD( ,  )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ADD( , 1)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ADD(42, 24)" })).toBe(66);
    expect(evaluateCell("A1", { A1: "=ADD(42, -24)" })).toBe(18);
    expect(evaluateCell("A1", { A1: "=ADD(42, 0.42)" })).toBe(42.42);
    expect(evaluateCell("A1", { A1: "=ADD(42, 42%)" })).toBe(42.42);
  });

  test("ADD: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=ADD(1, "")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=ADD(1, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=ADD(1, "3")' })).toBe(4);
    expect(evaluateCell("A1", { A1: '=ADD(1, "-3")' })).toBe(-2);
    expect(evaluateCell("A1", { A1: "=ADD(1, TRUE)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=ADD(1, FALSE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: '=ADD(1, "3%")' })).toBe(1.03);
  });

  test("ADD: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "1" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "1", A3: "42" })).toBe(43);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "-1", A3: "4.2" })).toBe(3.2);
  });

  test("ADD: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: '"3"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: "TRUE" })).toBe(43);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: "FALSE" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: '=""' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "42", A3: '="42"' })).toBe(84);

    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "03/01/2020", A3: "03/01/2020" })).toBe(
      87782
    );
    expect(
      evaluateCell("A1", {
        A1: "=ADD(A2, A3)",
        A2: "=A4+1",
        A3: "=A4+1",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(87784);
    expect(
      evaluateCell("A1", {
        A1: "=ADD(A2, A3)",
        A2: "=A4+0.1",
        A3: "=A4+0.1",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(87782.2);
    expect(evaluateCell("A1", { A1: "=ADD(A2, A3)", A2: "03/01/2020", A3: "2" })).toMatchObject({
      value: 43893,
    });
  });

  //----------------------------------------------------------------------------
  // CONCAT
  //----------------------------------------------------------------------------

  test("CONCAT: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=CONCAT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=CONCAT( ,  )" })).toBe("");
    expect(evaluateCell("A1", { A1: "=CONCAT( , 1)" })).toBe("1");
    expect(evaluateCell("A1", { A1: "=CONCAT(42, 24)" })).toBe("4224");
    expect(evaluateCell("A1", { A1: "=CONCAT(42, -24)" })).toBe("42-24");
    expect(evaluateCell("A1", { A1: "=CONCAT(42, 0.42)" })).toBe("420.42");
    expect(evaluateCell("A1", { A1: "=CONCAT(42, 42%)" })).toBe("420.42");
    expect(evaluateCell("A1", { A1: '=CONCAT(1, "")' })).toBe("1");
    expect(evaluateCell("A1", { A1: '=CONCAT(1, " ")' })).toBe("1 ");
    expect(evaluateCell("A1", { A1: '=CONCAT(1, "3")' })).toBe("13");
    expect(evaluateCell("A1", { A1: '=CONCAT(1, "-3")' })).toBe("1-3");
    expect(evaluateCell("A1", { A1: "=CONCAT(1, TRUE)" })).toBe("1TRUE");
    expect(evaluateCell("A1", { A1: "=CONCAT(1, FALSE)" })).toBe("1FALSE");
    expect(evaluateCell("A1", { A1: '=CONCAT(1, "3%")' })).toBe("13%");
    expect(evaluateCell("A1", { A1: '=CONCAT("ki", "kou")' })).toBe("kikou");
    expect(evaluateCell("A1", { A1: '=CONCAT("TRUE", TRUE)' })).toBe("TRUETRUE");
  });

  test("CONCAT: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)" })).toBe("");
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "1" })).toBe("1");
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "1", A3: "42" })).toBe("142");
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "42", A3: '""' })).toBe('42""');
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "42", A3: '"42"' })).toBe('42"42"');
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "42", A3: "TRUE" })).toBe("42TRUE");
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: '"TRUE"', A3: "TRUE" })).toBe(
      '"TRUE"TRUE'
    );
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "42", A3: '=""' })).toBe("42");
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "42", A3: '=" "' })).toBe("42 ");
    expect(evaluateCell("A1", { A1: "=CONCAT(A2, A3)", A2: "42", A3: '="24"' })).toBe("4224");
  });

  //----------------------------------------------------------------------------
  // DIVIDE
  //----------------------------------------------------------------------------

  test("DIVIDE: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=DIVIDE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=DIVIDE( ,  )" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=DIVIDE( , 1)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DIVIDE(84, 42)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=DIVIDE(48, -24)" })).toBe(-2);
    expect(evaluateCell("A1", { A1: "=DIVIDE(1, 0.5)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=DIVIDE(1, 5%)" })).toBe(20);
  });

  test("DIVIDE: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=DIVIDE("", 1)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=DIVIDE(" ", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=DIVIDE("4", 2)' })).toBe(2);
    expect(evaluateCell("A1", { A1: '=DIVIDE("-4", 2)' })).toBe(-2);
    expect(evaluateCell("A1", { A1: "=DIVIDE(TRUE, 0.5)" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=DIVIDE(FALSE, 42)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=DIVIDE(1, "50%")' })).toBe(2);
  });

  test("DIVIDE: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)" })).toBe("#ERROR"); // @compatibility: on google sheets, return #DIV/0!
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: "42", A3: "2" })).toBe(21);
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: "4.2", A3: "-1" })).toBe(-4.2);
  });

  test("DIVIDE: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: '""', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: '" "', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: '"3"', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: "TRUE", A3: "2" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: '=""', A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: '=" "', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=DIVIDE(A2, A3)", A2: "42", A3: '="42"' })).toBe(1);
  });

  //----------------------------------------------------------------------------
  // EQ
  //----------------------------------------------------------------------------

  test("EQ: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=EQ()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=EQ( ,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ( , 0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(42, 42)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(42, -42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(42, 42%)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(0.42, 42%)" })).toBe(true);
    expect(evaluateCell("A1", { A1: '=EQ("",  )' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=EQ("", 0)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=EQ("", " ")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=EQ("", "kikou")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=EQ("KIKOU", "kikou")' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(TRUE, 1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(TRUE, )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(FALSE, 0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(FALSE, )" })).toBe(true);
  });

  test("EQ: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "42", A3: "42" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "42", A3: "-42" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "0.42", A3: "42%" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A3: "test" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "TEST", A3: "test" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "TRUE", A3: "1" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: '=""' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: '=""', A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "=TRUE", A3: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: '="42"', A3: "42" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "03/01/2020", A3: "03/01/2020" })).toBe(
      true
    );
    expect(
      evaluateCell("A1", {
        A1: "=EQ(A2, A3)",
        A2: "=A4+1",
        A3: "=A4+1",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(true);
    expect(
      evaluateCell("A1", {
        A1: "=EQ(A2, A3)",
        A2: "=A4+0.1",
        A3: "=A4+0.2",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(false);
    expect(evaluateCell("A1", { A1: "=EQ(A2, A3)", A2: "03/01/2020", A3: "43891" })).toBe(true);
  });

  //----------------------------------------------------------------------------
  // GT
  //----------------------------------------------------------------------------

  test("GT: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=GT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=GT( ,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT( , 1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(1,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(42, 42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(42, 24)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(24, -22)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(42, 42%)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(0.42, 0.41)" })).toBe(true);

    expect(evaluateCell("A1", { A1: '=GT("", )' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT( , "")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(0, )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT( , 0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT("", 0)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT(0, "")' })).toBe(false);

    expect(evaluateCell("A1", { A1: '=GT("", " ")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT(" ", "")' })).toBe(true);

    expect(evaluateCell("A1", { A1: '=GT("b", "a")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT("a", "b")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT("KIKOU", "kikou")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT("kikou", "KIKOU")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT("5", "100")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT("100", "5")' })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GT(TRUE, 0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(0, TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(FALSE, 1)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(1, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(TRUE,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT( , TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(FALSE,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT( , FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(TRUE, FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(FALSE, TRUE)" })).toBe(false);

    expect(evaluateCell("A1", { A1: '=GT(32, "32")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT(32, "31")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GT("32", 31)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT("32", 99)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT("32", 1)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT("1", 99999)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GT("1", "99999")' })).toBe(false);
  });

  test("GT: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A3: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "42", A3: "42" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "42", A3: "24" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: '=""' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A3: '=""' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: '=""', A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "0", A3: '=""' })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "b", A3: "a" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "a", A3: "b" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "A", A3: "a" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "a", A3: "A" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "TRUE", A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "0", A3: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "FALSE", A3: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "1", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A3: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "TRUE", A3: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "FALSE", A3: "TRUE" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: '="1"', A3: "99999" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: '="1"', A3: '="99999"' })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "03/01/2020", A3: "03/01/2020" })).toBe(
      false
    );
    expect(
      evaluateCell("A1", {
        A1: "=GT(A2, A3)",
        A2: "=A4+1",
        A3: "=A4",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(true);
    expect(
      evaluateCell("A1", {
        A1: "=GT(A3, A2)",
        A2: "=A4+1",
        A3: "=A4",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(false);
    expect(
      evaluateCell("A1", {
        A1: "=GT(A2, A3)",
        A2: "=A4+0.1",
        A3: "=A4+0.2",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(false);
    expect(evaluateCell("A1", { A1: "=GT(A2, A3)", A2: "03/01/2020", A3: "4" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GT(A3, A2)", A2: "03/01/2020", A3: "4" })).toBe(false);
  });

  //----------------------------------------------------------------------------
  // GTE
  //----------------------------------------------------------------------------

  test("GTE: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=GTE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=GTE( ,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE( , 1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(1,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(42, 42)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(42, 24)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(24, -22)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(42, 42%)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(0.42, 0.41)" })).toBe(true);

    expect(evaluateCell("A1", { A1: '=GTE("", )' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE( , "")' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(0, )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE( , 0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("", 0)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE(0, "")' })).toBe(false);

    expect(evaluateCell("A1", { A1: '=GTE("", " ")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GTE(" ", "")' })).toBe(true);

    expect(evaluateCell("A1", { A1: '=GTE("b", "a")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("a", "b")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GTE("KIKOU", "kikou")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("kikou", "KIKOU")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("5", "100")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("100", "5")' })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GTE(TRUE, 0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(0, TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(FALSE, 1)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(1, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(TRUE,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE( , TRUE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(FALSE,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE( , FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(TRUE, FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(FALSE, TRUE)" })).toBe(false);

    expect(evaluateCell("A1", { A1: '=GTE(32, "32")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GTE(32, "31")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=GTE("32", 31)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("32", 99)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("32", 1)' })).toBe(true);

    expect(evaluateCell("A1", { A1: '=GTE("1", 99999)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=GTE("1", "99999")' })).toBe(false);
  });

  test("GTE: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A3: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "42", A3: "42" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "42", A3: "24" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: '=""' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A3: '=""' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: '=""', A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "0", A3: '=""' })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "b", A3: "a" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "a", A3: "b" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "A", A3: "a" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "a", A3: "A" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "TRUE", A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "0", A3: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "FALSE", A3: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "1", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A3: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A3: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "TRUE", A3: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "FALSE", A3: "TRUE" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: '="1"', A3: "99999" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: '="1"', A3: '="99999"' })).toBe(false);

    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "03/01/2020", A3: "03/01/2020" })).toBe(
      true
    );
    expect(
      evaluateCell("A1", {
        A1: "=GTE(A2, A3)",
        A2: "=A4+1",
        A3: "=A4",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(true);
    expect(
      evaluateCell("A1", {
        A1: "=GTE(A3, A2)",
        A2: "=A4+1",
        A3: "=A4",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(false);
    expect(
      evaluateCell("A1", {
        A1: "=GTE(A2, A3)",
        A2: "=A4+0.1",
        A3: "=A4+0.2",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(false);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "03/01/2020", A3: "4" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "03/01/2020", A3: "43891" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=GTE(A2, A3)", A2: "03/01/2020", A3: "100000" })).toBe(false);
  });

  //----------------------------------------------------------------------------
  // LT
  //----------------------------------------------------------------------------

  test("LT: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=LT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=LT( ,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT( , 1)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(1,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(42, 42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(42, 24)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(24, -22)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(42, 42%)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(0.42, 0.41)" })).toBe(false);

    expect(evaluateCell("A1", { A1: '=LT("", )' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT( , "")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(0, )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT( , 0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("", 0)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT(0, "")' })).toBe(true);

    expect(evaluateCell("A1", { A1: '=LT("", " ")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LT(" ", "")' })).toBe(false);

    expect(evaluateCell("A1", { A1: '=LT("b", "a")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("a", "b")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LT("KIKOU", "kikou")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("kikou", "KIKOU")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("5", "100")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("100", "5")' })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LT(TRUE, 0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(0, TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(FALSE, 1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(1, FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(TRUE,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT( , TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(FALSE,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT( , FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(TRUE, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(FALSE, TRUE)" })).toBe(true);

    expect(evaluateCell("A1", { A1: '=LT(32, "32")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LT(32, "31")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LT("32", 31)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("32", 99)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("32", 1)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("1", 99999)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LT("1", "99999")' })).toBe(true);
  });

  test("LT: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A3: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "42", A3: "42" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "42", A3: "24" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: '=""' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A3: '=""' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: '=""', A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "0", A3: '=""' })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "b", A3: "a" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "a", A3: "b" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "A", A3: "a" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "a", A3: "A" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "TRUE", A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "0", A3: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "FALSE", A3: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "1", A3: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A3: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "TRUE", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "FALSE", A3: "TRUE" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: '="1"', A3: "99999" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: '="1"', A3: '="99999"' })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "03/01/2020", A3: "03/01/2020" })).toBe(
      false
    );
    expect(
      evaluateCell("A1", {
        A1: "=LT(A2, A3)",
        A2: "=A4+1",
        A3: "=A4",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(false);
    expect(
      evaluateCell("A1", {
        A1: "=LT(A3, A2)",
        A2: "=A4+1",
        A3: "=A4",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(true);
    expect(
      evaluateCell("A1", {
        A1: "=LT(A2, A3)",
        A2: "=A4+0.1",
        A3: "=A4+0.2",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(true);
    expect(evaluateCell("A1", { A1: "=LT(A2, A3)", A2: "03/01/2020", A3: "4" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LT(A3, A2)", A2: "03/01/2020", A3: "4" })).toBe(true);
  });

  //----------------------------------------------------------------------------
  // LTE
  //----------------------------------------------------------------------------

  test("LTE: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=LTE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=LTE( ,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE( , 1)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(1,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(42, 42)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(42, 24)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(24, -22)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(42, 42%)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(0.42, 0.41)" })).toBe(false);

    expect(evaluateCell("A1", { A1: '=LTE("", )' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE( , "")' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(0, )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE( , 0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE("", 0)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LTE(0, "")' })).toBe(true);

    expect(evaluateCell("A1", { A1: '=LTE("", " ")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE(" ", "")' })).toBe(false);

    expect(evaluateCell("A1", { A1: '=LTE("b", "a")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LTE("a", "b")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE("KIKOU", "kikou")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE("kikou", "KIKOU")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE("5", "100")' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LTE("100", "5")' })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LTE(TRUE, 0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(0, TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(FALSE, 1)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(1, FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(TRUE,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE( , TRUE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(FALSE,  )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE( , FALSE)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(TRUE, FALSE)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(FALSE, TRUE)" })).toBe(true);

    expect(evaluateCell("A1", { A1: '=LTE(32, "32")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE(32, "31")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=LTE("32", 31)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LTE("32", 99)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LTE("32", 1)' })).toBe(false);

    expect(evaluateCell("A1", { A1: '=LTE("1", 99999)' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=LTE("1", "99999")' })).toBe(true);
  });

  test("LTE: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A3: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "42", A3: "42" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "42", A3: "24" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: '=""' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A3: '=""' })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: '=""', A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "0", A3: '=""' })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "b", A3: "a" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "a", A3: "b" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "A", A3: "a" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "a", A3: "A" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "TRUE", A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "0", A3: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "FALSE", A3: "1" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "1", A3: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "TRUE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A3: "TRUE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A3: "FALSE" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "TRUE", A3: "FALSE" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "FALSE", A3: "TRUE" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: '="1"', A3: "99999" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: '="1"', A3: '="99999"' })).toBe(true);

    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "03/01/2020", A3: "03/01/2020" })).toBe(
      true
    );
    expect(
      evaluateCell("A1", {
        A1: "=LTE(A2, A3)",
        A2: "=A4+1",
        A3: "=A4",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(false);
    expect(
      evaluateCell("A1", {
        A1: "=LTE(A3, A2)",
        A2: "=A4+1",
        A3: "=A4",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(true);
    expect(
      evaluateCell("A1", {
        A1: "=LTE(A2, A3)",
        A2: "=A4+0.1",
        A3: "=A4+0.2",
        A4: "03/01/2020",
        A5: "03/01/2020",
      })
    ).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "03/01/2020", A3: "4" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "03/01/2020", A3: "43891" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=LTE(A2, A3)", A2: "03/01/2020", A3: "100000" })).toBe(true);
  });

  //----------------------------------------------------------------------------
  // MINUS
  //----------------------------------------------------------------------------

  test("MINUS: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=MINUS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MINUS( ,  )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINUS( , 1)" })).toBe(-1);
    expect(evaluateCell("A1", { A1: "=MINUS(42, 24)" })).toBe(18);
    expect(evaluateCell("A1", { A1: "=MINUS(42, -24)" })).toBe(66);
    expect(evaluateCell("A1", { A1: "=MINUS(42, 0.42)" })).toBe(41.58);
    expect(evaluateCell("A1", { A1: "=MINUS(42, 42%)" })).toBe(41.58);
  });

  test("MINUS: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=MINUS(1, "")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=MINUS(1, " ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MINUS(1, "3")' })).toBe(-2);
    expect(evaluateCell("A1", { A1: '=MINUS(1, "-3")' })).toBe(4);
    expect(evaluateCell("A1", { A1: "=MINUS(1, TRUE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINUS(1, FALSE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: '=MINUS(1, "3%")' })).toBe(0.97);
  });

  test("MINUS: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "1" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A3: "1" })).toBe(-1);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "1", A3: "42" })).toBe(-41);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "-1", A3: "4.2" })).toBe(-5.2);
  });

  test("MINUS: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: '"3"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: "TRUE" })).toBe(41);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: "FALSE" })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: '=""' })).toBe(42);
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: '=" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MINUS(A2, A3)", A2: "42", A3: '="42"' })).toBe(0);
  });

  //----------------------------------------------------------------------------
  // MULTIPLY
  //----------------------------------------------------------------------------

  test("MULTIPLY: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=MULTIPLY()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=MULTIPLY( ,  )" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MULTIPLY( , 2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(2, 4)" })).toBe(8);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(2, -3)" })).toBe(-6);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(3, 0.5)" })).toBe(1.5);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(2, 5%)" })).toBe(0.1);
  });

  test("MULTIPLY: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=MULTIPLY("", 1)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MULTIPLY(" ", 1)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=MULTIPLY("4", 2)' })).toBe(8);
    expect(evaluateCell("A1", { A1: '=MULTIPLY("-3", 2)' })).toBe(-6);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(TRUE, 0.5)" })).toBe(0.5);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(FALSE, 42)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=MULTIPLY(2, "50%")' })).toBe(1);
  });

  test("MULTIPLY: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: "42", A3: "2" })).toBe(84);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: "4.2", A3: "-2" })).toBe(-8.4);
  });

  test("MULTIPLY: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: '""', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: '" "', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: '"3"', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: "TRUE", A3: "2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: '=""', A3: "42" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: '=" "', A3: "42" })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=MULTIPLY(A2, A3)", A2: "42", A3: '="42"' })).toBe(1764);
  });

  //----------------------------------------------------------------------------
  // NE
  //----------------------------------------------------------------------------

  test("NE: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=NE()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=NE( ,  )" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE( , 0)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(42, 42)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(42, -42)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(42, 42%)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(0.42, 42%)" })).toBe(false);
    expect(evaluateCell("A1", { A1: '=NE("",  )' })).toBe(false);
    expect(evaluateCell("A1", { A1: '=NE("", 0)' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=NE("", " ")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=NE("", "kikou")' })).toBe(true);
    expect(evaluateCell("A1", { A1: '=NE("KIKOU", "kikou")' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(TRUE, 1)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(TRUE, )" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(FALSE, 0)" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(FALSE, )" })).toBe(false);
  });

  test("NE: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A3: "0" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: "42", A3: "42" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: "42", A3: "-42" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: "0.42", A3: "42%" })).toBe(false);

    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A3: "test" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: "TEST", A3: "test" })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: "TRUE", A3: "1" })).toBe(true);

    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: '=""' })).toBe(false);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: '=""', A3: "0" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: "=TRUE", A3: "1" })).toBe(true);
    expect(evaluateCell("A1", { A1: "=NE(A2, A3)", A2: '="42"', A3: "42" })).toBe(true);
  });

  //----------------------------------------------------------------------------
  // POW
  //----------------------------------------------------------------------------

  test.each([
    ["0", "0", 1],
    ["0", "0.5", 0],
    ["4", "0", 1],
    ["0", "4", 0],
    ["4", "2", 16],
    ["-4", "2", 16],
    ["4", "3", 64],
    ["-4", "3", -64],
    ["4", "0.5", 2],
    ["4", "-0.5", 0.5],
    ["4", "-2", 0.0625],
  ])("POW(%s, %s) - %s: take 2 parameter(s), return a number", (a, b, expected) => {
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: a, A3: b })).toBe(expected);
  });

  test.each([
    ["-4", "0.5"],
    ["-4", "1.5"],
    ["-4", "0.2"],
  ])("POW(%s, %s) - error: take 2 parameter(s), return an error on parameter 2", (a, b) => {
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: a, A3: b })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("POW: special value testing", () => {
    expect(evaluateCell("A1", { A1: "=POW()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=POW( , )" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(42, 2)" })).toBe(1764);
    expect(evaluateCell("A1", { A1: "=POW( , 12)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=POW(42, )" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(42.42, TRUE)" })).toBe(42.42);
    expect(evaluateCell("A1", { A1: "=POW(42.42, FALSE)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(TRUE, 10)" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(FALSE, 10)" })).toBe(0);

    expect(evaluateCell("A1", { A1: '=POW("" , "")' })).toBe(1);
    expect(evaluateCell("A1", { A1: '=POW("" , 12)' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=POW(" " , 12)' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=POW("42", 2)' })).toBe(1764);
    expect(evaluateCell("A1", { A1: '=POW("42", "2")' })).toBe(1764);
    expect(evaluateCell("A1", { A1: '=POW("42", "")' })).toBe(1);

    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "", A3: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "42", A3: "2" })).toBe(1764);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "", A3: "12" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "42", A3: "" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "42.42", A3: "TRUE" })).toBe(42.42);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "42.42", A3: "FALSE" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "TRUE", A3: "10" })).toBe(1);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: "FALSE", A3: "10" })).toBe(0);

    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: '"42"', A3: '"12"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!

    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: '=""', A3: '="2"' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=POW(A2, A3)", A2: '="42"', A3: '="2"' })).toBe(1764);
  });

  //----------------------------------------------------------------------------
  // UMINUS
  //----------------------------------------------------------------------------

  test("UMINUS: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=UMINUS()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=UMINUS(0)" })).toBe(-0);
    expect(evaluateCell("A1", { A1: "=UMINUS(2)" })).toBe(-2);
    expect(evaluateCell("A1", { A1: "=UMINUS(-3)" })).toBe(3);
  });

  test("UMINUS: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=UMINUS("")' })).toBe(-0);
    expect(evaluateCell("A1", { A1: '=UMINUS(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=UMINUS("4")' })).toBe(-4);
    expect(evaluateCell("A1", { A1: '=UMINUS("-3")' })).toBe(3);
    expect(evaluateCell("A1", { A1: "=UMINUS(TRUE)" })).toBe(-1);
    expect(evaluateCell("A1", { A1: "=UMINUS(FALSE)" })).toBe(-0);
    expect(evaluateCell("A1", { A1: '=UMINUS("test")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("UMINUS: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)" })).toBe(-0);
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: "0" })).toBe(-0);
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: "-2" })).toBe(2);
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: "3" })).toBe(-3);
  });

  test("UMINUS: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: "TRUE" })).toBe(-1);
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: "FALSE" })).toBe(-0);
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: '=""' })).toBe(-0);
    expect(evaluateCell("A1", { A1: "=UMINUS(A2)", A2: '="42"' })).toBe(-42);
  });

  //----------------------------------------------------------------------------
  // UNARY.PERCENT
  //----------------------------------------------------------------------------

  test("UNARY.PERCENT: functional tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT()" })).toBe("#BAD_EXPR"); // @compatibility: on google sheets, return #N/A
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(0)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(2)" })).toBe(0.02);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(-3)" })).toBe(-0.03);
  });

  test("UNARY.PERCENT: casting tests on simple arguments", () => {
    expect(evaluateCell("A1", { A1: '=UNARY.PERCENT("")' })).toBe(0);
    expect(evaluateCell("A1", { A1: '=UNARY.PERCENT(" ")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: '=UNARY.PERCENT("4")' })).toBe(0.04);
    expect(evaluateCell("A1", { A1: '=UNARY.PERCENT("-3")' })).toBe(-0.03);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(3%)" })).toBe(0.0003);
    expect(evaluateCell("A1", { A1: '=UNARY.PERCENT("3%")' })).toBe(0.0003);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(TRUE)" })).toBe(0.01);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(FALSE)" })).toBe(0);
    expect(evaluateCell("A1", { A1: '=UNARY.PERCENT("test")' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
  });

  test("UNARY.PERCENT: functional tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: "0" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: "-2" })).toBe(-0.02);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: "3" })).toBe(0.03);
  });

  test("UNARY.PERCENT: casting tests on cell arguments", () => {
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: "TRUE" })).toBe(0.01);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: "FALSE" })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: '""' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: '" "' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: '"42"' })).toBe("#ERROR"); // @compatibility: on google sheets, return #VALUE!
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: '=""' })).toBe(0);
    expect(evaluateCell("A1", { A1: "=UNARY.PERCENT(A2)", A2: '="42"' })).toBe(0.42);
  });
});