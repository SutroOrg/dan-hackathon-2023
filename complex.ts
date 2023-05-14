const orderOfMag = (num: number) => {
  if (num === 0) {
    return 0;
  }
  return Math.floor(Math.log10(Math.abs(num)));
};

export class Complex {
  public readonly real: number;
  public readonly imaginary: number;
  constructor(real: number, imaginary: number = 0) {
    this.real = orderOfMag(real) < -3 ? 0 : real;
    this.imaginary = orderOfMag(imaginary) < -3 ? 0 : imaginary;
  }

  times(other: Complex): Complex {
    return new Complex(
      this.real * other.real - this.imaginary * other.imaginary,
      this.real * other.imaginary + this.imaginary * other.real
    );
  }

  dividedBy(other: Complex): Complex {
    const denominator = other.real ** 2 + other.imaginary ** 2;
    return new Complex(
      (this.real * other.real + this.imaginary * other.imaginary) / denominator,
      (this.imaginary * other.real - this.real * other.imaginary) / denominator
    );
  }

  plus(other: Complex): Complex {
    return new Complex(
      this.real + other.real,
      this.imaginary + other.imaginary
    );
  }

  minus(other: Complex): Complex {
    return new Complex(
      this.real - other.real,
      this.imaginary - other.imaginary
    );
  }

  abs() {
    return Math.sqrt(this.real ** 2 + this.imaginary ** 2);
  }
}
