import java.util.*;
public class Lecture8 {
    public static void main(String args []) {
      try (Scanner sc = new Scanner(System.in)) {
        System.out.println("PROGRAM SHALL COUNT THE NUMBER OF POSITIVE, NEGETIVE, ZEROES ENTERED. \n Enter anything other than integer to terminate program ");
        
        // int x = sc.nextInt();
        int positive = 0;
        int negative = 0;
        int zero = 0;
        int total=0;
        char choice;
         do {
          System.out.println("Enter number");
            int n = sc.nextInt();
          if (n>0) {
                  positive++; total++;
                 } else if (n<0) {
                      negative++;  total++;
                 } else if (n == 0) {
                  zero++;  total++;
                 }  else if ( n == 908) {
                  break;
                 }
                 
          }
        
        while ( true
          
                );
        
        
        System.out.println("Total numbers: "+total);
        System.out.println("Positive numbers: "+positive);
        System.out.println("Negative numbers: "+negative);
        System.out.println("zeroes: " +zero );
        
      }
    }
}