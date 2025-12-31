import React from 'react';
import { BookOpen, History, Target, Heart, ExternalLink } from 'lucide-react';

export default function OurSystem() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Our System
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            The Story of Awarjana Creations and Studio
          </p>
          <div className="mt-6 flex justify-center">
            <a 
              href="https://awarjana-creations.netlify.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold rounded-full transition-all shadow-lg hover:shadow-primary-500/25"
            >
              Visit Official Site <ExternalLink size={18} className="ml-2" />
            </a>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-16">
          {/* Our Story */}
          <section className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <div className="inline-flex p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600 dark:text-blue-400 mb-4">
                <History size={28} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Story</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Welcome to Awarjana Creations and Studio, where creativity meets commitment. Established on October 22, 2011, we have been proudly serving our clients with passion, integrity, and efficiency for over a decade.
              </p>
            </div>
            <div className="md:w-1/2 bg-white dark:bg-dark-lighter p-8 rounded-[2rem] shadow-xl border dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400 italic">
                "We believe in the power of creativity and innovation. Our mission is to bring your ideas to life through exceptional design and craftsmanship."
              </p>
            </div>
          </section>

          {/* Mission */}
          <section className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="md:w-1/2">
              <div className="inline-flex p-3 bg-green-100 dark:bg-green-900/30 rounded-2xl text-green-600 dark:text-green-400 mb-4">
                <Target size={28} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Mission & Client Focus</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Since our inception, our mission has remained clear: to deliver legal, customer-friendly, and fast services that not only meet but exceed expectations. Our dedication to quality and our customer-first approach have earned us the trust and love of our growing client base.
              </p>
            </div>
            <div className="md:w-1/2 bg-white dark:bg-dark-lighter p-8 rounded-[2rem] shadow-xl border dark:border-gray-700">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-dark rounded-xl">
                  <div className="text-2xl font-bold text-primary-500">10+</div>
                  <div className="text-xs text-gray-500">Years Experience</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-dark rounded-xl">
                  <div className="text-2xl font-bold text-primary-500">100%</div>
                  <div className="text-xs text-gray-500">Commitment</div>
                </div>
              </div>
            </div>
          </section>

          {/* Values */}
          <section className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <div className="inline-flex p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl text-purple-600 dark:text-purple-400 mb-4">
                <Heart size={28} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Our Values & Approach</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                At Awarjana, we believe in building relationships that last—powered by transparency, professionalism, and a relentless pursuit of excellence. Whether you're a returning client or visiting us for the first time, we're here to provide solutions tailored to your needs with a touch of creativity and a heart full of care.
              </p>
            </div>
            <div className="md:w-1/2 bg-white dark:bg-dark-lighter p-8 rounded-[2rem] shadow-xl border dark:border-gray-700">
              <p className="text-gray-600 dark:text-gray-400">
                Experience the Awarjana difference—where service is not just a promise, but a tradition.
              </p>
            </div>
          </section>
        </div>

        {/* Footer Link */}
        <div className="mt-20 text-center border-t dark:border-gray-700 pt-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Want to see more of our work?</p>
          <a 
            href="https://awarjana-creations.netlify.app/" 
            className="text-primary-500 hover:text-primary-600 font-bold underline decoration-2 underline-offset-4"
          >
            Explore Awarjana Creations
          </a>
        </div>
      </div>
    </div>
  );
}
