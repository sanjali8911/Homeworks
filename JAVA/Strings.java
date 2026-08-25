import java.util.*;
public class Strings{
    //concatenation 
    public static void main( String args[]){
        Scanner sc = new Scanner(System.in);
//  String firstname = sc.nextLine();
// String fullname = "Tony Stark";
// String Sentence = "My name is The " + firstname;
// String locus = Sentence.substring(11,Sentence.length());
// System.out.println(locus);
// // System.out.println("your name is: "+ name);
// String Nametosen = firstname + " to " + Sentence;

// System.out.println(Nametosen + Nametosen.length());
// //charAt
// for(int i =0; i<fullname.length(); i++) {
//     System.out.println(fullname.charAt(i));
// } 
// comparing Strings
// s1 > s2 : +ve value
// s1 == s2 : 0
// s1 < s2 : -ve value
// hello < wello
// 
// String Jhola1 = "Aloo";
// String Jhola2 = "aloo";
// String Jhola3 = "Baigan";
// String Jhola4 = "Baigan";
// if(Jhola1.compareTo(Jhola3) == 0) {
// System.out.println("Strings are equal");
// } else if (Jhola1.compareTo(Jhola3) < 0) {
// System.out.println("Capital wins");    
// }
//  else {
//     System.out.println("Strings ain't equal");
// }
//Strings are Immutable
// String builder 
// StringBuilder sb = new StringBuilder("Tony");
//Set Char at index 0
// sb.setCharAt(0, 'p');
// sb.insert(0, 'S');

// sb.insert(2, 'a');

// sb.delete(1, 3);
// sb.append("lony");
// System.out.println(sb);
//reverse String
 StringBuilder sb = new StringBuilder("Tony");
for(int i =0; i<=sb.length()/2; i++) {
  int front = i;
  int back = sb.length() -1 - i;
  char frontChar = sb.charAt(front);
  char backChar = sb.charAt(back);

  sb.setCharAt(front, backChar);
  sb.setCharAt(back, frontChar);

}
System.out.println(sb);
    }
}
